import { mkdtemp } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import type { RuntimeConfig } from "@gmv/config";
import type { PlanningSystemAdapter } from "@gmv/notion-adapter";
import type { Mission, NotionPlanningSnapshot } from "@gmv/contracts";

export async function createTempPaths(prefix: string): Promise<{
  rootDir: string;
  stateFile: string;
  storyMirrorDir: string;
}> {
  const rootDir = await mkdtemp(path.join(tmpdir(), prefix));

  return {
    rootDir,
    stateFile: path.join(rootDir, "runtime-state.json"),
    storyMirrorDir: path.join(rootDir, "stories")
  };
}

export function createTestConfig(paths: {
  stateFile: string;
  storyMirrorDir: string;
}): RuntimeConfig {
  return {
    NODE_ENV: "test",
    PORT: 3101,
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
    GMV_STATE_FILE: paths.stateFile,
    STORY_MIRROR_DIR: paths.storyMirrorDir,
    QUEUE_DRIVER: "inline",
    STATE_DRIVER: "file",
    EXECUTIVE_REPORT_INTERVAL_MINUTES: 0,
    notionEnabled: false,
    liveDatabaseConfigured: false
  };
}

export function createFakePlanningAdapter(
  snapshot: NotionPlanningSnapshot
): PlanningSystemAdapter {
  return {
    enabled: true,
    getStatus() {
      return { enabled: true };
    },
    async projectMission(mission: Mission) {
      return {
        pageId: `notion-${mission.id}`,
        url: `https://notion.local/${mission.id}`
      };
    },
    async pullPlanningSnapshot() {
      return snapshot;
    },
    async syncGovernanceState(items) {
      return {
        updated: items.map((item) => item.planningItemId),
        skipped: []
      };
    }
  };
}
