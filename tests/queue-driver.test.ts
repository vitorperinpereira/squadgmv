import { describe, expect, it } from "vitest";
import {
  createQueueDriver,
  resolvePgBossConnectionOptions
} from "@gmv/queue";

describe("queue driver", () => {
  it("retries inline jobs and moves exhausted work to the dead-letter queue", async () => {
    const queue = createQueueDriver({
      driver: "inline"
    });
    let attempts = 0;

    await queue.register(
      "planning.sync-from-notion",
      async () => {
        attempts += 1;
        throw new Error("sync failed");
      },
      {
        retryLimit: 2,
        deadLetter: "planning-sync-from-notion-dead-letter"
      }
    );

    await queue.start();
    const queued = await queue.publish("planning.sync-from-notion", {
      correlationId: "planning_sync_test"
    });

    expect(queued.queueName).toBe("planning.sync-from-notion");
    expect(attempts).toBe(3);

    const failed = await queue.listFailed("planning.sync-from-notion");
    expect(
      failed.some(
        (job) =>
          job.queueName === "planning.sync-from-notion" &&
          job.state === "failed"
      )
    ).toBe(true);
    expect(
      failed.some(
        (job) =>
          job.queueName === "planning-sync-from-notion-dead-letter" &&
          job.sourceQueueName === "planning.sync-from-notion"
      )
    ).toBe(true);

    const stats = await queue.getStats();
    expect(
      stats.queues.find((item) => item.name === "planning.sync-from-notion")
        ?.totalCount
    ).toBe(1);
    expect(
      stats.queues.find(
        (item) => item.name === "planning-sync-from-notion-dead-letter"
      )?.queuedCount
    ).toBe(1);

    await queue.stop();
  });

  it("fails fast when pg-boss is requested without a live database", () => {
    expect(() =>
      createQueueDriver({
        driver: "pg-boss"
      })
    ).toThrow("QUEUE_DRIVER=pg-boss requires DATABASE_URL");
  });

  it("defaults to relaxed certificate validation for Supabase PostgreSQL hosts", () => {
    const resolved = resolvePgBossConnectionOptions({
      connectionString:
        "postgresql://postgres:secret@db.exampleproject.supabase.co:5432/postgres?sslmode=require"
    });

    expect(resolved.connectionString).toBe(
      "postgresql://postgres:secret@db.exampleproject.supabase.co:5432/postgres"
    );
    expect(resolved.ssl).toEqual({
      rejectUnauthorized: false
    });
  });

  it("strips sslmode when SSL is explicitly provided", () => {
    const resolved = resolvePgBossConnectionOptions({
      connectionString:
        "postgresql://postgres:secret@db.exampleproject.supabase.co:5432/postgres?sslmode=require&application_name=gmv",
      ssl: {
        rejectUnauthorized: false
      }
    });

    expect(resolved.connectionString).toBe(
      "postgresql://postgres:secret@db.exampleproject.supabase.co:5432/postgres?application_name=gmv"
    );
    expect(resolved.ssl).toEqual({
      rejectUnauthorized: false
    });
  });
});
