# Live Environment Checklist

## Objetivo

Separar claramente o que depende de ambiente, o que ja esta resolvido no codigo e o que ainda e uma limitacao real do runtime.

## Verdade atual do repo

- o adapter do Notion so liga quando os cinco campos `NOTION_*` existem
- `pg-boss` so fica utilizavel com `DATABASE_URL`
- o config aceita `STATE_DRIVER=postgres`, mas o bootstrap ainda usa apenas `FileRuntimeRepository`
- por isso, a topologia live mais segura hoje continua sendo de um processo principal em modo `combined`
- o problema de path cross-platform do teste de queue nao esta aberto nesta revisao

## Dependencias por tipo

| Dependencia | O que habilita | O que acontece sem ela | Classificacao |
| --- | --- | --- | --- |
| `NOTION_TOKEN` + 4 IDs `NOTION_*` | projection, sync e governance sync-back live | `/health` mostra `notion.enabled: false` e o adapter fica desabilitado | ambiente |
| `DATABASE_URL` | queue duravel com `pg-boss` | fila live nao sobe de forma util | ambiente |
| `QUEUE_DRIVER=pg-boss` | queue PostgreSQL real | runtime fica em `inline` | ambiente |
| `STATE_DRIVER=postgres` | seria a base para split `api + worker` | hoje nao fecha o fluxo sozinho porque nao existe repository postgres no runtime | codigo |
| `SUPABASE_*` | padronizacao do ambiente Supabase | nao bloqueia o core atual | ambiente opcional |
| `SENTRY_DSN` | observabilidade externa | nao bloqueia o core atual | ambiente opcional |

## O que quebra sem `.env`

### Sem Notion live

- `projectMission()` nao projeta no workspace real
- `pnpm gmv:sync` falha com adapter desabilitado
- `docs/stories` nao recebe mirror vindo do workspace real

### Sem PostgreSQL live

- `QUEUE_DRIVER=pg-boss` nao fica operacional
- `pnpm gmv:queue:smoke` nao fecha a validacao real

### Sem um path persistente para estado

- o runtime pode iniciar, mas voce arrisca perder o estado em restart
- isso afeta missoes, planning items, approvals, validations, workflows e snapshots

## O que hoje e bug ou limitacao real de codigo

### Limitacao real

- `STATE_DRIVER=postgres` ainda nao conecta um repository postgres de verdade
- split seguro `api + worker` depende dessa evolucao

### Nao e bug aberto nesta revisao

- `tests/queue-runtime.test.ts` ja usa `path.join`
- helpers de teste, smoke script e story mirror tambem usam APIs corretas de path

## Perfis recomendados

### Baseline local

```env
STATE_DRIVER=file
QUEUE_DRIVER=inline
EXECUTIVE_REPORT_INTERVAL_MINUTES=0
GMV_STATE_FILE=.gmv/runtime-state.json
STORY_MIRROR_DIR=docs/stories
```

### Live com Notion

Adicione:

```env
NOTION_TOKEN=
NOTION_PROJECTS_DATABASE_ID=
NOTION_EPICS_DATABASE_ID=
NOTION_STORIES_DATABASE_ID=
NOTION_TASKS_DATABASE_ID=
```

### Live com queue duravel

Adicione:

```env
DATABASE_URL=
QUEUE_DRIVER=pg-boss
```

Mantenha `STATE_DRIVER=file` no repo atual.

## Checklist de readiness

- [ ] `.env` criado a partir de `.env.example`
- [ ] `GMV_STATE_FILE` aponta para um caminho persistente
- [ ] `STORY_MIRROR_DIR` aponta para um diretorio gravavel
- [ ] Se houver Notion live, os cinco campos `NOTION_*` estao preenchidos
- [ ] Se houver `pg-boss`, `DATABASE_URL` esta acessivel a partir do host
- [ ] `/health` responde `ok: true`
- [ ] `pnpm gmv:status` responde sem crash
- [ ] `pnpm gmv:report` responde sem crash

## Comandos de verificacao

```bash
curl http://localhost:3001/health
pnpm gmv:status
pnpm gmv:report
pnpm gmv:sync
pnpm gmv:queue
```

## Quando tratar como problema de ambiente

- credencial ausente
- URL de banco invalida
- SSL ou firewall do banco
- workspace do Notion sem schema esperado
- host sem permissao para gravar `GMV_STATE_FILE`

## Quando tratar como problema de codigo

- falha reproduz no mesmo ambiente completo
- o erro acontece tambem com `QUEUE_DRIVER=inline`
- o runtime entra em conflito por depender de persistencia que o repo ainda nao implementa

## Referencias

- [`README.md`](../README.md)
- [`docs/mvp-status.md`](./mvp-status.md)
- [`docs/smoke-tests.md`](./smoke-tests.md)
- [`docs/notion-live-contract.md`](./notion-live-contract.md)
- [`docs/deploy-vps.md`](./deploy-vps.md)
