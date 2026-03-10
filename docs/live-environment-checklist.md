# Live Environment Checklist

Documento de readiness para ambiente live do runtime GMV, baseado no codigo atual, nas stories em progresso e no estado atual de `C:\Users\Pichau\Desktop\GMV IA First\.env`.

## 1. Variaveis obrigatorias para Notion e PostgreSQL/Supabase

### Obrigatorias para o Notion live

| Variavel | Obrigatoria hoje | Uso pratico |
| --- | --- | --- |
| `NOTION_TOKEN` | Sim | Habilita o adapter real do Notion. Sem isso, o runtime cai no adapter desabilitado. |
| `NOTION_PROJECTS_DATABASE_ID` | Sim | Database/data source canonico de `Projects`. Usado na projection de missoes e no sync. |
| `NOTION_EPICS_DATABASE_ID` | Sim | Database/data source canonico de `Epics`. Usado no sync. |
| `NOTION_STORIES_DATABASE_ID` | Sim | Database/data source canonico de `Stories`. Usado no sync e no espelhamento para `docs/stories`. |
| `NOTION_TASKS_DATABASE_ID` | Sim | Database/data source canonico de `Tasks`. Usado no sync e nos boards/reports. |

### Obrigatorias para PostgreSQL/Supabase live

| Variavel | Obrigatoria hoje | Uso pratico |
| --- | --- | --- |
| `DATABASE_URL` | Sim para live queue | String de conexao PostgreSQL usada pelo `pg-boss` e pelo `drizzle.config.ts`. Sem isso nao existe fila live. |
| `QUEUE_DRIVER` | Sim para live queue | Deve ficar em `pg-boss` para validar a story 2.2 com fila real. Se continuar `inline`, a fila live continua bloqueada. |

### Recomendadas para Supabase

| Variavel | Obrigatoria hoje | Uso pratico |
| --- | --- | --- |
| `SUPABASE_URL` | Nao para as stories citadas | Presente no config, util para padronizar o ambiente Supabase. O runtime atual nao consome essa chave para desbloquear 1.3, 1.4, 1.5, 2.2, 2.4 ou 4.2. |
| `SUPABASE_ANON_KEY` | Nao para as stories citadas | Presente no config, mas nao e usada pelos fluxos live hoje. |
| `SUPABASE_SERVICE_ROLE_KEY` | Nao para as stories citadas | Presente no config, mas nao e usada pelos fluxos live hoje. |

### Variavel operacional que precisa de atencao

| Variavel | Estado recomendado hoje | Motivo |
| --- | --- | --- |
| `STATE_DRIVER` | `file` | O config aceita `postgres`, mas o bootstrap atual ainda instancia `FileRuntimeRepository` diretamente. Trocar para `postgres` hoje nao liga persistencia live real. |

## 2. O que ja existe hoje no `.env` sem expor valores

### Variaveis presentes e preenchidas

- `NODE_ENV`
- `AIOX_VERSION`

### Variaveis presentes, mas vazias

- `DEEPSEEK_API_KEY`
- `OPENROUTER_API_KEY`
- `ANTHROPIC_API_KEY`
- `OPENAI_API_KEY`
- `EXA_API_KEY`
- `CONTEXT7_API_KEY`
- `SUPABASE_URL`
- `SUPABASE_ANON_KEY`
- `SUPABASE_SERVICE_ROLE_KEY`
- `GITHUB_TOKEN`
- `CLICKUP_API_KEY`
- `N8N_API_KEY`
- `N8N_WEBHOOK_URL`
- `SENTRY_DSN`
- `RAILWAY_TOKEN`
- `VERCEL_TOKEN`

### Variaveis que faltam no `.env` atual, mas ja existem no `.env.example`

- `DATABASE_URL`
- `PORT`
- `LOG_LEVEL`
- `STATE_DRIVER`
- `QUEUE_DRIVER`
- `GMV_STATE_FILE`
- `STORY_MIRROR_DIR`
- `NOTION_TOKEN`
- `NOTION_PROJECTS_DATABASE_ID`
- `NOTION_EPICS_DATABASE_ID`
- `NOTION_STORIES_DATABASE_ID`
- `NOTION_TASKS_DATABASE_ID`

## 3. O que falta para destravar as stories

| Story | O que falta de ambiente | O que ainda nao e so ambiente |
| --- | --- | --- |
| `1.3` | Preencher `NOTION_TOKEN` + 4 IDs canonicos do Notion e compartilhar as databases/data sources com a integracao. | Validar a projection com credenciais reais e databases reais. |
| `1.4` | Mesmo pacote do Notion da story 1.3. Tambem e necessario que `Projects`, `Epics`, `Stories` e `Tasks` existam no workspace canonico com relacoes e propriedades compativeis com o adapter. | Validacao manual live do refinamento por C-levels no Notion canonico. |
| `1.5` | Mesmo pacote do Notion da story 1.4, porque boards e drilldown dependem de planning items sincronizados e URLs reais do Notion. | Validar boards e drilldown com objetos live do Notion. |
| `2.2` | Preencher `DATABASE_URL` de um PostgreSQL/Supabase real e ajustar `QUEUE_DRIVER=pg-boss`. Rodar API + worker com acesso ao banco. | Retries e dead-letter ainda estao pendentes no codigo; ambiente live sozinho nao fecha toda a Definition of Done. |
| `2.4` | Mesmo pacote do Notion da story 1.4 para que gates e entregas fiquem ligados a objetos reais. | O sync-back live de validacoes/approvals para Notion ainda esta pendente de implementacao; ambiente sozinho nao conclui a story. |
| `4.2` | Mesmo pacote do Notion da story 1.4 para materializar links reais em KPIs e reports. | Recorrencia/agendamento ainda esta pendente se a meta for fechar a story por completo. |

### Schema minimo que o workspace do Notion precisa ter

As quatro estruturas canonicas do Notion precisam existir e aceitar, no minimo, os campos usados hoje pelo adapter:

- `Name`
- `Runtime ID`
- `Mission ID`
- `Description`
- `Sector`
- `Priority`
- `Process Type`
- `Planning Status`
- `Execution Status`
- `Owner`
- `Context Summary`
- `Acceptance Criteria`
- `Dependencies`
- `Input Summary`
- `Expected Output`
- `Validation Needed`
- Relacoes `Project`, `Epic` e `Story` conforme o tipo do item

Observacao importante: os nomes das variaveis sugerem `database_id`, mas o adapter atual usa `parent.database_id` na criacao de pagina e `dataSources.query` no sync. Na validacao live, confirme que os IDs fornecidos sao aceitos por ambos os caminhos.

## 4. Comandos locais de verificacao

### 4.1 Conferir se as chaves criticas existem, sem mostrar valores

```powershell
Get-Content .env |
  Where-Object { $_ -match '^(NOTION_|DATABASE_URL|QUEUE_DRIVER|STATE_DRIVER|SUPABASE_)' } |
  ForEach-Object {
    $name, $value = $_ -split '=', 2
    $status = if ([string]::IsNullOrWhiteSpace($value)) { 'empty' } else { 'set' }
    "{0}: {1}" -f $name, $status
  }
```

### 4.2 Subir a API e checar o health

```powershell
npm run dev:api
```

Em outro terminal:

```powershell
Invoke-RestMethod http://localhost:3001/health | ConvertTo-Json -Depth 5
```

Esperado no live readiness:

- `notion.enabled: true`
- `queueDriver: "pg-boss"` para a story 2.2
- `storage.liveDatabaseConfigured: true`

### 4.3 Subir o worker live

```powershell
npm run dev:worker
```

Esperado:

- startup sem erro de conexao no PostgreSQL
- log indicando `queueDriver: "pg-boss"`
- log indicando `notionEnabled: true` quando o pacote Notion estiver completo

### 4.4 Rodar sync do Notion

```powershell
npm run gmv:sync
```

Esperado:

- retorno com `items`
- story mirror preenchendo `docs/stories` para stories `ready`
- ausencia de erro de adapter desabilitado

### 4.5 Rodar o report executivo

```powershell
npm run gmv:report
```

Esperado:

- KPIs consolidados
- `missingData` diminuindo conforme o Notion live e os fluxos reais entram
- links externos do Notion aparecendo nos objetos sincronizados

## 5. Checklist objetivo do que o usuario precisa fornecer/configurar

- [ ] Fornecer `NOTION_TOKEN`.
- [ ] Fornecer `NOTION_PROJECTS_DATABASE_ID`.
- [ ] Fornecer `NOTION_EPICS_DATABASE_ID`.
- [ ] Fornecer `NOTION_STORIES_DATABASE_ID`.
- [ ] Fornecer `NOTION_TASKS_DATABASE_ID`.
- [ ] Compartilhar as quatro estruturas canonicas do Notion com a integracao usada pelo token.
- [ ] Confirmar que o schema do Notion contem as propriedades e relacoes esperadas pelo adapter atual.
- [ ] Fornecer `DATABASE_URL` de um PostgreSQL real ou de um projeto Supabase com acesso permitido para o worker.
- [ ] Ajustar `QUEUE_DRIVER=pg-boss` no `.env` quando a validacao live da fila comecar.
- [ ] Manter `STATE_DRIVER=file` por enquanto, porque persistencia em Postgres ainda nao esta ligada no bootstrap.
- [ ] Se houver padrao corporativo de Supabase, preencher tambem `SUPABASE_URL`, `SUPABASE_ANON_KEY` e `SUPABASE_SERVICE_ROLE_KEY` para nao deixar o ambiente incompleto, mesmo que essas chaves nao sejam bloqueadoras hoje.
- [ ] Subir `npm run dev:api` e validar `/health`.
- [ ] Subir `npm run dev:worker` e confirmar que a fila live inicia sem erro.
- [ ] Rodar `npm run gmv:sync` para validar 1.3, 1.4 e 1.5 com objetos reais do Notion.
- [ ] Rodar `npm run gmv:report` para validar 4.2 com dados live.
- [ ] Tratar a story `2.2` como parcialmente bloqueada por implementacao enquanto retries/dead-letter nao forem fechados.
- [ ] Tratar a story `2.4` como parcialmente bloqueada por implementacao enquanto o sync-back de gates para Notion nao existir.
- [ ] Tratar a story `4.2` como parcialmente bloqueada por implementacao se a meta incluir recorrencia/agendamento.
