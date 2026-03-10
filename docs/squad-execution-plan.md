# GMV AI Company Squad Execution Plan

## Objective

Distribuir as tasks restantes do projeto entre os agentes corretos, respeitando dependencias, bloqueios de ambiente e o principio `CLI First -> Observability Second -> UI Third`.

## Squad Called by `@aiox-master`

| Agent | Role in this wave | Primary ownership |
|------|------|------|
| `@aiox-master` | Orquestracao | sequencing, handoffs, consolidacao de status |
| `@pm` | Planejamento de execucao | readiness, checkpoints de aceite, backlog live |
| `@architect` | Arquitetura de integracao | desenho do fluxo Notion live, drilldown e contratos de sync |
| `@dev` | Implementacao runtime | API, sync engine, dashboards, reports, glue code |
| `@data-engineer` | Dados e fila live | PostgreSQL, `pg-boss`, retries, dead-letter, reconciliacao |
| `@devops` | Ambiente e operacao | Railway, Supabase, secrets, variaveis, runbooks, health checks |
| `@qa` | Validacao final | regression, smoke tests, acceptance por story |

## Remaining Tasks and Owners

| Order | Story | Main owner | Supporting agents | Scope |
|------|------|------|------|------|
| 1 | `1.3` | `@architect` | `@dev`, `@devops` | fechar criacao real de projetos no Notion |
| 2 | `1.4` | `@architect` | `@dev`, `@pm` | fechar refinamento live `Projects -> Epics -> Stories -> Tasks` |
| 3 | `1.5` | `@dev` | `@architect`, `@qa` | ligar boards e mission detail aos objetos reais do Notion |
| 4 | `2.2` | `@data-engineer` | `@dev`, `@devops` | endurecer `pg-boss` live, retries, dead-letter e reconciliacao |
| 5 | `2.4` | `@dev` | `@architect`, `@qa` | sincronizar gates e decisoes de validacao de volta para o Notion |
| 6 | `4.2` | `@dev` | `@pm`, `@qa`, `@devops` | relatórios recorrentes e KPI tracking live |

## Execution Waves

### Wave 1: Environment and contracts

- `@devops`: validar `NOTION_TOKEN`, IDs das 4 databases, `DATABASE_URL`, secrets e checklist de ambiente live.
- `@architect`: fechar o contrato canonico entre runtime e Notion para `1.3`, `1.4`, `1.5` e `2.4`.
- `@pm`: transformar as 6 frentes restantes em checkpoints objetivos, com Definition of Done live.

### Wave 2: Runtime and data hardening

- `@dev`: implementar projection/sync-back/drilldown live e recorrencia de reports.
- `@data-engineer`: endurecer a fila live, reconciliacao e fallback operacional com PostgreSQL.
- `@architect`: revisar impactos cross-stack antes de merge de cada slice.

### Wave 3: Validation and cutover

- `@qa`: smoke test por story e validacao ponta a ponta do fluxo live.
- `@aiox-master`: consolidar status, destravar handoffs e mover a proxima wave.

## Handoff Chain

1. `@pm` entrega checklist de aceite para `@aiox-master`.
2. `@architect` entrega contrato de integracao para `@dev` e `@devops`.
3. `@devops` libera ambiente e credenciais para `@dev` e `@data-engineer`.
4. `@data-engineer` entrega fila/banco live para `@dev`.
5. `@dev` entrega implementacao para `@qa`.
6. `@qa` devolve aprovacao ou bloqueios para `@aiox-master`.

## Blockers Already Known

- `1.3`, `1.4`, `1.5` e `2.4` dependem de credenciais reais do Notion e IDs das databases.
- `2.2` depende de `DATABASE_URL` funcional para validar `pg-boss` fora do modo `inline`.
- `4.2` depende do mapeamento live entre KPI, mission, planning item e objeto real do Notion.

## Start Order Recommended Now

1. `@devops` prepara ambiente live.
2. `@architect` fecha contrato de integracao Notion/runtime.
3. `@data-engineer` desenha o hardening de `pg-boss`.
4. `@dev` implementa os slices desbloqueados.
5. `@qa` valida cada entrega antes da proxima wave.
