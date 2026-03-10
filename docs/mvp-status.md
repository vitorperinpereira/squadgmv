# MVP Status

## Snapshot

Data desta leitura: `2026-03-10`

Objetivo deste documento: deixar explicito o que esta pronto no codigo, o que depende de ambiente para funcionar de novo em outro lugar, o que ainda e parcial para operacao real e o que esta fora do escopo do MVP.

Leitura executiva:

- o backlog do PRD esta implementado
- o runtime ja entrega valor real por CLI e API
- Notion live, governance sync-back e executive reporting ja foram validados com evidencia em ambiente real
- o principal gap para VPS mais confiavel e a persistencia do runtime ainda ser file-backed
- o bug de path cross-platform citado no teste de queue nao esta aberto nesta revisao do repo

## Matriz rapida

| Slice | Estado | Leitura curta |
| --- | --- | --- |
| Runtime shell | pronto | API, CLI, healthcheck, boards, queue surface e testes existem e passam |
| Notion integration | pronto no codigo, dependente de ambiente | precisa das cinco variaveis `NOTION_*` em qualquer ambiente novo |
| Queue live | parcialmente pronto | `pg-boss` e smoke live existem, mas split seguro `api + worker` depende de repository em PostgreSQL |
| Governance sync | pronto no codigo, dependente de ambiente | approvals e validations ja sincronizam de volta para o Notion live |
| Executive reports | pronto | report sob demanda, historico e scheduler existem |
| VPS deployment | parcialmente pronto | da para subir em Node Linux, mas a topologia canonica hoje ainda e de um processo com estado em arquivo |
| External integrations | fora do escopo | CRM, ads, WhatsApp, BI e automacoes extras nao fazem parte do MVP atual |

## Pronto

### Runtime shell

- existe runtime HTTP com `/health`, `/api/missions`, `/api/sync/notion/reconcile`, `/api/queue/*`, `/api/boards/*` e `/api/reports/*`
- existe CLI operacional em `bin/gmv.ts`
- existe espelhamento local de stories prontas em `docs/stories`
- lint, typecheck, tests e build fazem parte do gate do repo

### Governance sync

- approvals, validations e decision notes podem ser escritos de volta no Notion
- a evidencia live esta registrada em [`docs/notion-live-validation.md`](./notion-live-validation.md)

### Executive reports

- `report:executive`, `report:generate` e `report:history` ja existem
- o scheduler usa `EXECUTIVE_REPORT_INTERVAL_MINUTES`
- os reports ja carregam referencias explicitas para missoes, planning items e links do Notion

### Cross-platform baseline

- `tests/queue-runtime.test.ts` passa
- `tests/test-helpers.ts`, `scripts/queue-smoke-pgboss.ts` e `packages/notion-adapter/src/index.ts` usam `path.join`
- nao foi encontrado outro uso real de separador Windows hardcoded nas areas de queue/runtime/tests

## Parcialmente pronto

### Queue live

O que ja existe:

- driver `inline`
- driver `pg-boss`
- retry, dead-letter, stats, listagem de falhas e retry manual
- smoke validator real para PostgreSQL/Supabase

O que falta para chamar de topologia live realmente robusta:

- repository de runtime em PostgreSQL
- split seguro `api -> producer` e `worker -> consumer`

Hoje, o config aceita `STATE_DRIVER=postgres`, mas o bootstrap ainda cria apenas `FileRuntimeRepository`.

### VPS deployment

O que ja existe:

- entrypoints claros para API e worker
- healthcheck
- comandos de queue/report/sync
- docs de deploy e operacao

O que ainda e gap:

- service files versionados no repo
- automacao de provisionamento
- backup operacional padrao no host
- topologia de dois processos sem repository postgres

## Bloqueado por ambiente

### Notion integration

Sem estas variaveis, o adapter fica desabilitado:

- `NOTION_TOKEN`
- `NOTION_PROJECTS_DATABASE_ID`
- `NOTION_EPICS_DATABASE_ID`
- `NOTION_STORIES_DATABASE_ID`
- `NOTION_TASKS_DATABASE_ID`

Sintoma esperado: `/health` retorna `notion.enabled: false`.

### Queue live

Sem `DATABASE_URL`, nao existe `pg-boss` real.

Sintoma esperado: `QUEUE_DRIVER=pg-boss` nao sobe de forma util para fila duravel.

### Observabilidade e deploy

Sem estes itens, o runtime ainda pode funcionar, mas o ambiente fica incompleto:

- `SENTRY_DSN`
- host Linux com `systemd` ou processo equivalente
- rotina de backup para `GMV_STATE_FILE`

## Fora do escopo

- control plane UI como superficie primaria
- CRM e pipeline externo
- canais de ads, WhatsApp ou mensageria externa
- ClickUp como alternativa ao Notion
- BI dedicado

## Proximos gaps com maior retorno

1. Implementar um repository de runtime em PostgreSQL.
2. Padronizar o deploy VPS com um processo canonico versionado.
3. Transformar o smoke test live em gate oficial de release.
