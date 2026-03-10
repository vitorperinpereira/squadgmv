import { config } from "dotenv";
import { defineConfig } from "drizzle-kit";

config();

if (!process.env.DATABASE_URL) {
  console.warn(
    "[drizzle] DATABASE_URL not configured. db:generate and db:push require a live PostgreSQL connection."
  );
}

export default defineConfig({
  dialect: "postgresql",
  schema: "./packages/domain/src/schema.ts",
  out: "./drizzle",
  dbCredentials: {
    url: process.env.DATABASE_URL ?? "postgres://postgres:postgres@localhost:5432/gmv_ai_company"
  }
});
