# GMV Tech Stack

## Foundation

- Runtime: `Node.js 24`
- Language: `TypeScript 5.9.3`
- Monorepo: `pnpm workspaces + turbo`
- API: `Fastify 5.8.2`
- Validation: `Zod 4.3.6`
- Logging: `Pino 10.3.1`
- Queue: `pg-boss 12.14.0`
- Database target: `PostgreSQL / Supabase`
- ORM and migrations: `Drizzle ORM 0.45.1 + drizzle-kit 0.31.9`
- Notion integration: `@notionhq/client 5.11.1`
- Tests: `Vitest 4.0.18`

## Bootstrap Note

The live production target is PostgreSQL plus Notion. This initial implementation also supports a local file-backed state adapter so the runtime can boot and be tested before Supabase and Notion credentials are wired.
