# GMV AI Company

[![CI](https://github.com/vitorperinpereira/squadgmv/actions/workflows/ci.yml/badge.svg)](https://github.com/vitorperinpereira/squadgmv/actions/workflows/ci.yml)

Runtime operacional agent-first para a GMV AI Company, com `Notion` como fonte canônica de planejamento, `Supabase/PostgreSQL` para execução e `AIOX/Codex` como superfície principal dos squads.

## Stack

- `Node.js + TypeScript`
- `Fastify`
- `Drizzle ORM`
- `pg-boss`
- `Notion API`
- `Supabase/PostgreSQL`

## Fluxo MVP

`Vitor/Fundadores -> missão -> OpenClaw cria projeto no Notion -> C-level refina epics/stories/tasks -> runtime sincroniza -> squads executam -> approvals/validations -> status volta ao Notion`

## Comandos principais

```bash
pnpm install
pnpm lint
pnpm typecheck
pnpm test
pnpm build
pnpm gmv:status
pnpm gmv:report
```

## Automação no GitHub

- `CI` em push para `main` e pull requests
- `Release` automática ao publicar tags `v*.*.*`
- `Dependabot` semanal para dependências `npm` e `GitHub Actions`

## Documentação

- [PRD](docs/prd.md)
- [Arquitetura](docs/architecture.md)
- [Sequência de tasks](docs/task-sequence.md)
