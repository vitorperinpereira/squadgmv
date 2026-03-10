# GMV Runtime + Notion Minimal

Este pacote e um recorte minimo, repassavel e quase executavel do runtime GMV que conversa com o Notion.

## O que entrou

- `apps/runtime`: API, worker, bootstrap e repositorio local em arquivo
- `packages/notion-adapter`: adaptador Notion com project, pull e sync-back
- `packages/contracts`: schemas e tipos canonicos
- `packages/domain`: servicos de missao, planning sync, governance e boards
- `packages/config`: leitura das variaveis de ambiente
- `packages/queue`: queue inline e pg-boss
- `packages/observability`: logger e correlation id
- `packages/auth`: autorizacao minima usada pela API
- `packages/memory`: dependencia pequena usada pelo runtime
- `bin/gmv.ts`: CLI principal
- `docs/notion-live-contract.md`: contrato da integracao com o Notion

## O que ficou de fora

- testes
- drizzle e migracoes
- artefatos de IDE e framework AIOX
- docs que nao sao estritamente necessarios para entender a integracao
- quaisquer segredos locais do `.env`

## Como subir

1. Rode `pnpm install`
2. Crie `.env` a partir de `.env.example`
3. Preencha `NOTION_TOKEN` e os 4 `NOTION_*_DATABASE_ID`
4. Rode `pnpm dev:api`
5. Em outro terminal, rode `pnpm dev:worker`

## Fluxo minimo que este pacote cobre

1. Criar missao no runtime
2. Projetar a missao para `Projects` no Notion
3. Sincronizar `Projects`, `Epics`, `Stories` e `Tasks` do Notion para o runtime
4. Espelhar stories prontas em `docs/stories`
5. Sincronizar de volta estados de governance, validation e approval

## Comandos uteis

- `pnpm gmv:status`
- `pnpm gmv:sync`
- `pnpm gmv:tasks`
- `pnpm gmv:report`

## Endpoints uteis

- `GET /health`
- `POST /api/missions`
- `POST /api/sync/notion/reconcile`
- `POST /api/sync/notion/governance`
- `GET /api/missions/:missionId`
- `GET /api/tasks`
- `GET /api/boards/executive`

## Pontos-chave do Notion

- O adapter usa `data_source_id`
- Os 4 bancos canonicos sao `Projects`, `Epics`, `Stories` e `Tasks`
- A propriedade de correlacao principal e `Runtime ID`
- O contrato completo esta em `docs/notion-live-contract.md`
