import { config } from "dotenv";
import { z } from "zod";

config({ quiet: true });

const envSchema = z.object({
  NODE_ENV: z.enum(["development", "test", "production"]).default("development"),
  PORT: z.coerce.number().default(3001),
  LOG_LEVEL: z.enum(["fatal", "error", "warn", "info", "debug", "trace"]).default("info"),
  DATABASE_URL: z.string().optional(),
  SUPABASE_URL: z.string().optional(),
  SUPABASE_ANON_KEY: z.string().optional(),
  SUPABASE_SERVICE_ROLE_KEY: z.string().optional(),
  SENTRY_DSN: z.string().optional(),
  NOTION_TOKEN: z.string().optional(),
  NOTION_PROJECTS_DATABASE_ID: z.string().optional(),
  NOTION_EPICS_DATABASE_ID: z.string().optional(),
  NOTION_STORIES_DATABASE_ID: z.string().optional(),
  NOTION_TASKS_DATABASE_ID: z.string().optional(),
  GMV_STATE_FILE: z.string().default(".gmv/runtime-state.json"),
  STORY_MIRROR_DIR: z.string().default("docs/stories"),
  QUEUE_DRIVER: z.enum(["inline", "pg-boss"]).default("inline"),
  STATE_DRIVER: z.enum(["file", "postgres"]).default("file")
});

export type RuntimeConfig = z.infer<typeof envSchema> & {
  notionEnabled: boolean;
  liveDatabaseConfigured: boolean;
};

export function loadRuntimeConfig(): RuntimeConfig {
  const parsed = envSchema.parse(process.env);

  return {
    ...parsed,
    notionEnabled: Boolean(
      parsed.NOTION_TOKEN &&
        parsed.NOTION_PROJECTS_DATABASE_ID &&
        parsed.NOTION_EPICS_DATABASE_ID &&
        parsed.NOTION_STORIES_DATABASE_ID &&
        parsed.NOTION_TASKS_DATABASE_ID
    ),
    liveDatabaseConfigured: Boolean(parsed.DATABASE_URL)
  };
}
