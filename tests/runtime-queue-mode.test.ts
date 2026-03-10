import { describe, expect, it } from "vitest";
import type { RuntimeConfig } from "@gmv/config";
import {
  getQueueModeWarning,
  resolveQueueProcessMode
} from "../apps/runtime/src/bootstrap.js";

function createConfig(
  patch?: Partial<RuntimeConfig>
): RuntimeConfig {
  return {
    NODE_ENV: "test",
    PORT: 3001,
    LOG_LEVEL: "info",
    DATABASE_URL: undefined,
    DATABASE_SSL_REJECT_UNAUTHORIZED: true,
    SUPABASE_URL: undefined,
    SUPABASE_ANON_KEY: undefined,
    SUPABASE_SERVICE_ROLE_KEY: undefined,
    SENTRY_DSN: undefined,
    NOTION_TOKEN: undefined,
    NOTION_PROJECTS_DATABASE_ID: undefined,
    NOTION_EPICS_DATABASE_ID: undefined,
    NOTION_STORIES_DATABASE_ID: undefined,
    NOTION_TASKS_DATABASE_ID: undefined,
    GMV_STATE_FILE: ".gmv/runtime-state.json",
    STORY_MIRROR_DIR: "docs/stories",
    QUEUE_DRIVER: "inline",
    STATE_DRIVER: "file",
    EXECUTIVE_REPORT_INTERVAL_MINUTES: 0,
    notionEnabled: false,
    liveDatabaseConfigured: false,
    ...patch
  };
}

describe("runtime queue mode resolution", () => {
  it("keeps inline mode combined for both API and worker", () => {
    const config = createConfig({
      QUEUE_DRIVER: "inline"
    });

    expect(resolveQueueProcessMode(config, "api")).toBe("combined");
    expect(resolveQueueProcessMode(config, "worker")).toBe("combined");
    expect(getQueueModeWarning(config, "api")).toBeNull();
  });

  it("falls back to combined mode when pg-boss uses file state", () => {
    const config = createConfig({
      QUEUE_DRIVER: "pg-boss",
      STATE_DRIVER: "file",
      DATABASE_URL: "postgres://gmv:gmv@localhost:5432/gmv",
      liveDatabaseConfigured: true
    });

    expect(resolveQueueProcessMode(config, "api")).toBe("combined");
    expect(resolveQueueProcessMode(config, "worker")).toBe("combined");
    expect(getQueueModeWarning(config, "worker")).toContain(
      "STATE_DRIVER=file"
    );
  });

  it("splits API and worker only when runtime state is backed by postgres", () => {
    const config = createConfig({
      QUEUE_DRIVER: "pg-boss",
      STATE_DRIVER: "postgres",
      DATABASE_URL: "postgres://gmv:gmv@localhost:5432/gmv",
      liveDatabaseConfigured: true
    });

    expect(resolveQueueProcessMode(config, "api")).toBe("producer");
    expect(resolveQueueProcessMode(config, "worker")).toBe("consumer");
    expect(getQueueModeWarning(config, "api")).toBeNull();
  });
});
