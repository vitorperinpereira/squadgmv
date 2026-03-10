import { randomUUID } from "node:crypto";
import { mkdtemp, readdir, rm } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { config as loadDotenv } from "dotenv";
import { loadRuntimeConfig } from "@gmv/config";
import { createQueueDriver } from "@gmv/queue";
import { createRuntimeContext } from "../apps/runtime/src/bootstrap.js";

loadDotenv({ quiet: true });

const databaseUrl = process.env.DATABASE_URL;

if (!databaseUrl) {
  throw new Error(
    "DATABASE_URL is required to run the pg-boss smoke validation."
  );
}

const coreValidation = await runCoreQueueValidation(databaseUrl);
const runtimeValidation = await runRuntimeQueueValidation(databaseUrl);

console.log(
  JSON.stringify(
    {
      executedAt: new Date().toISOString(),
      databaseBackend: "postgresql",
      queueDriver: "pg-boss",
      coreValidation,
      runtimeValidation
    },
    null,
    2
  )
);

async function runCoreQueueValidation(connectionString: string) {
  const queue = createQueueDriver({
    driver: "pg-boss",
    connectionString
  });
  const correlationId = randomUUID();
  const queueName = `gmv.queue-smoke.${correlationId}`;
  const deadLetterQueue = `${queueName}.dead-letter`;
  const attempts = new Map<string, number>();

  await queue.register<{ correlationId: string }>(
    queueName,
    async (job) => {
      const count = (attempts.get(job.data.correlationId) ?? 0) + 1;
      attempts.set(job.data.correlationId, count);

      if (count === 1) {
        throw new Error("Intentional smoke failure for pg-boss dead-letter validation.");
      }
    },
    {
      retryLimit: 0,
      deadLetter: deadLetterQueue
    }
  );

  await queue.start();

  try {
    const published = await queue.publish(queueName, {
      correlationId
    });
    const failedJobs = await waitFor(
      async () => await queue.listFailed(queueName),
      (jobs) =>
        jobs.some(
          (job) =>
            job.queueName === queueName &&
            job.state === "failed"
        ) &&
        jobs.some(
          (job) =>
            job.queueName === deadLetterQueue &&
            job.sourceQueueName === queueName
        )
    );

    const deadLetterJob = failedJobs.find(
      (job) =>
        job.queueName === deadLetterQueue && job.sourceQueueName === queueName
    );

    if (!deadLetterJob) {
      throw new Error("Dead-letter job not found during pg-boss smoke validation.");
    }

    const retryResult = await queue.retry(deadLetterQueue, deadLetterJob.id);

    await waitFor(
      async () => attempts.get(correlationId) ?? 0,
      (count) => count >= 2
    );

    const stats = await queue.getStats();

    return {
      queueName,
      deadLetterQueue,
      publishedJobId: published.jobId,
      retryResult,
      attempts: attempts.get(correlationId) ?? 0,
      failedJobs: failedJobs.map((job) => ({
        id: job.id,
        queueName: job.queueName,
        sourceQueueName: job.sourceQueueName,
        state: job.state
      })),
      stats
    };
  } finally {
    await queue.stop();
  }
}

async function runRuntimeQueueValidation(connectionString: string) {
  const baseConfig = loadRuntimeConfig();
  const tempDir = await mkdtemp(path.join(os.tmpdir(), "gmv-pgboss-smoke-"));
  const storyMirrorDir = path.join(tempDir, "stories");
  const stateFile = path.join(tempDir, "runtime-state.json");
  const config = {
    ...baseConfig,
    DATABASE_URL: connectionString,
    QUEUE_DRIVER: "pg-boss" as const,
    STATE_DRIVER: "file" as const,
    STORY_MIRROR_DIR: storyMirrorDir,
    GMV_STATE_FILE: stateFile,
    liveDatabaseConfigured: true
  };

  const context = await createRuntimeContext({
    config,
    queueMode: "combined"
  });

  try {
    const queued = await context.planningService.enqueuePlanningSync();
    const workflowRun = await waitFor(
      async () =>
        (await context.workflowService.listRuns()).find(
          (run) =>
            run.queueJobId === queued.jobId &&
            run.jobName === "planning.sync-from-notion" &&
            (run.status === "succeeded" || run.status === "failed")
        ) ?? null,
      (run) => Boolean(run)
    );
    const planningItems = await context.repository.listPlanningItems();
    const mirroredFiles = await safeReadDir(storyMirrorDir);

    return {
      queueJobId: queued.jobId,
      queueName: queued.queueName,
      workflowStatus: workflowRun?.status ?? "unknown",
      planningItemsSynced: planningItems.length,
      mirroredFiles,
      notionEnabled: baseConfig.notionEnabled
    };
  } finally {
    await context.close();
    await rm(tempDir, {
      recursive: true,
      force: true
    });
  }
}

async function safeReadDir(targetPath: string): Promise<string[]> {
  try {
    return await readdir(targetPath);
  } catch {
    return [];
  }
}

async function waitFor<T>(
  producer: () => Promise<T>,
  predicate: (value: T) => boolean,
  timeoutMs = 30_000,
  intervalMs = 500
): Promise<T> {
  const deadline = Date.now() + timeoutMs;

  while (Date.now() < deadline) {
    const value = await producer();
    if (predicate(value)) {
      return value;
    }

    await sleep(intervalMs);
  }

  throw new Error(`Timed out after ${timeoutMs}ms waiting for async condition.`);
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => {
    setTimeout(resolve, ms);
  });
}
