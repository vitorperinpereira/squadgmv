# squadgmv

[![CI](https://github.com/vitorperinpereira/squadgmv/actions/workflows/ci.yml/badge.svg)](https://github.com/vitorperinpereira/squadgmv/actions/workflows/ci.yml)

Runtime agent-first da GMV AI Company para operar missoes, sincronizar planejamento no Notion, executar handoffs com governanca e acompanhar a saude do squad por CLI e API.

## O que e este projeto

O repo implementa o nucleo operacional da GMV AI Company:

- intake de missoes
- projection de projetos no Notion
- sync de `Projects -> Epics -> Stories -> Tasks`
- espelhamento local de stories `ready` em `docs/stories`
- handoffs, approvals, validations e escalations
- boards executivos, task dashboard e relatorios
- fila `inline` ou `pg-boss` para jobs do runtime

## Para quem ele existe

- Vitor e operadores da GMV que comandam o runtime via CLI
- founders e leadership que precisam ler saude operacional rapido
- agentes e squads que dependem de backlog canonico vindo do Notion

## O que ja funciona

- runtime HTTP com `/health`, missoes, sync, queue, boards, reports e governance
- CLI operacional em [`bin/gmv.ts`](./bin/gmv.ts)
- projection live para Notion e sync-back de governanca validados em ambiente real
- queue stats, retry manual, dead-letter e smoke validator de `pg-boss`
- memoria modular, optimization loop, capabilities e onboarding
- report executivo sob demanda, historico e scheduler configuravel
- suite de testes Vitest cobrindo runtime, queue, reporting, governance e sync

O ponto de path cross-platform citado no teste de queue nao esta aberto neste estado do repo: `tests/queue-runtime.test.ts`, `tests/test-helpers.ts`, `scripts/queue-smoke-pgboss.ts` e `packages/notion-adapter/src/index.ts` ja usam `node:path`.

## Stack

- `Node.js`
- `TypeScript`
- `Fastify`
- `Drizzle ORM`
- `pg-boss`
- `Notion API`
- `Supabase/PostgreSQL` para queue live
- estado runtime atual persistido em arquivo JSON

## Arquitetura em 60 segundos

- [`apps/runtime`](./apps/runtime): API, worker e bootstrap do runtime
- [`bin/gmv.ts`](./bin/gmv.ts): superficie CLI principal
- [`packages/domain`](./packages/domain): regras de negocio, services e repositorio
- [`packages/notion-adapter`](./packages/notion-adapter): projection, sync e story mirror
- [`packages/queue`](./packages/queue): driver `inline` e `pg-boss`
- [`docs/stories`](./docs/stories): stories prontas espelhadas do Notion

Observacao operacional importante: o config aceita `STATE_DRIVER=postgres`, mas o runtime ainda instancia apenas [`apps/runtime/src/infrastructure/file-runtime-repository.ts`](./apps/runtime/src/infrastructure/file-runtime-repository.ts). Hoje, a persistencia canonica do runtime continua file-backed.

## Como rodar local

1. Instale dependencias:

   ```bash
   pnpm install
   ```

2. Crie `.env` a partir de `.env.example`.

3. Para baseline local, mantenha:

   ```env
   NODE_ENV=development
   PORT=3001
   LOG_LEVEL=info
   STATE_DRIVER=file
   QUEUE_DRIVER=inline
   EXECUTIVE_REPORT_INTERVAL_MINUTES=0
   GMV_STATE_FILE=.gmv/runtime-state.json
   STORY_MIRROR_DIR=docs/stories
   ```

4. Suba o runtime:

   ```bash
   pnpm dev:api
   ```

5. Em outro terminal, valide o estado:

   ```bash
   pnpm gmv:status
   ```

Para desenvolvimento rapido, normalmente basta a API. Suba `pnpm dev:worker` apenas quando estiver validando a topologia de worker, e consulte [`docs/deploy-vps.md`](./docs/deploy-vps.md) antes de usar split em ambiente real.

## Como configurar `.env`

### Minimo para local

- `STATE_DRIVER=file`
- `QUEUE_DRIVER=inline`
- `GMV_STATE_FILE`
- `STORY_MIRROR_DIR`

### Para habilitar Notion live

Preencha os cinco campos abaixo:

- `NOTION_TOKEN`
- `NOTION_PROJECTS_DATABASE_ID`
- `NOTION_EPICS_DATABASE_ID`
- `NOTION_STORIES_DATABASE_ID`
- `NOTION_TASKS_DATABASE_ID`

Sem eles, o runtime responde `notion.enabled: false` no `/health` e o adapter fica desabilitado.

### Para habilitar queue live com `pg-boss`

- `DATABASE_URL`
- `QUEUE_DRIVER=pg-boss`

Mesmo com `DATABASE_URL`, mantenha `STATE_DRIVER=file` no repo atual. O driver de fila pode usar PostgreSQL hoje; a persistencia principal do runtime ainda nao.

### O que hoje nao e bloqueador

- `SUPABASE_URL`
- `SUPABASE_ANON_KEY`
- `SUPABASE_SERVICE_ROLE_KEY`
- `SENTRY_DSN`

Essas chaves sao uteis para o ambiente completo, mas nao desbloqueiam o core do MVP sozinhas.

## Como validar Notion

Use estes artefatos como fonte canonica:

- [`docs/notion-live-contract.md`](./docs/notion-live-contract.md)
- [`docs/notion-live-validation.md`](./docs/notion-live-validation.md)
- [`docs/smoke-tests.md`](./docs/smoke-tests.md)

Fluxo minimo:

1. criar uma missao via CLI
2. confirmar projection do projeto no Notion
3. refinar pelo menos `Epic`, `Story` e `Task` no workspace
4. rodar `pnpm gmv:sync`
5. listar tasks e conferir links externos
6. gerar report executivo

## Como subir API e worker

### API

```bash
pnpm dev:api
```

### Worker

```bash
pnpm dev:worker
```

### Regra pratica hoje

- local: API costuma ser suficiente
- VPS atual: prefira topologia de um processo em modo `combined` enquanto `STATE_DRIVER=file`
- split real `api + worker`: trate como proximo slice, nao como topologia canonica do repo atual

## Comandos uteis

```bash
pnpm lint
pnpm typecheck
pnpm test
pnpm build
pnpm gmv:status
pnpm gmv:sync
pnpm gmv:queue
pnpm gmv:report
pnpm gmv:report:generate
pnpm gmv:report:history
pnpm gmv:queue:smoke
pnpm exec tsx bin/gmv.ts mission:create --title "..." --objective "..."
pnpm exec tsx bin/gmv.ts tasks:list --mission-id "..."
```

## Leitura recomendada

- [`START_HERE.md`](./START_HERE.md)
- [`docs/prd.md`](./docs/prd.md)
- [`docs/architecture.md`](./docs/architecture.md)
- [`docs/mvp-status.md`](./docs/mvp-status.md)
- [`docs/live-environment-checklist.md`](./docs/live-environment-checklist.md)
- [`docs/smoke-tests.md`](./docs/smoke-tests.md)
- [`docs/deploy-vps.md`](./docs/deploy-vps.md)
- [`docs/operations-runbook.md`](./docs/operations-runbook.md)

## Estado atual do MVP

Resumo curto:

- core de produto e backlog do PRD estao implementados
- Notion live, governance sync-back e executive reporting ja tem evidencia real
- o principal gap tecnico para operacao mais robusta em VPS e migrar o runtime repository de arquivo para PostgreSQL
- o principal gap operacional e padronizar deploy, smoke test live e rotina diaria

Use [`docs/mvp-status.md`](./docs/mvp-status.md) para a leitura brutalmente clara do que esta pronto, parcial, bloqueado por ambiente e fora do escopo.
