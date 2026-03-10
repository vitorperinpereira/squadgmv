# Manifesto Do Pacote

## Estrutura incluida

- `apps/runtime/package.json`
- `apps/runtime/src/app.ts`
- `apps/runtime/src/bootstrap.ts`
- `apps/runtime/src/server.ts`
- `apps/runtime/src/worker.ts`
- `apps/runtime/src/task-dashboard-page.ts`
- `apps/runtime/src/infrastructure/file-runtime-repository.ts`
- `bin/gmv.ts`
- `docs/notion-live-contract.md`
- `packages/auth/*`
- `packages/config/*`
- `packages/contracts/*`
- `packages/domain/*`
- `packages/memory/*`
- `packages/notion-adapter/*`
- `packages/observability/*`
- `packages/queue/*`
- `package.json`
- `pnpm-workspace.yaml`
- `tsconfig.json`
- `.env.example`

## Dependencias externas

- `@notionhq/client`
- `dotenv`
- `fastify`
- `pg-boss`
- `pino`
- `zod`
- `tsx`
- `typescript`
- `@types/node`

## Justificativa do recorte

- Mantem a CLI, API, worker e adapter Notion no mesmo pacote
- Preserva os aliases `@gmv/*` sem exigir o restante do monorepo
- Deixa o handoff pequeno o suficiente para repasse, mas ainda reconhecivel para quem for continuar o trabalho
