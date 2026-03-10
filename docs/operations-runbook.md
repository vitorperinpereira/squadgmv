# Operations Runbook

## Objetivo

Este documento descreve a rotina diaria de operacao do runtime GMV e a primeira resposta para incidentes comuns.

## Regra de ouro

Enquanto `STATE_DRIVER=file`, trate o runtime atual como uma operacao de um processo principal. API unica em modo `combined` e a referencia mais segura do repo hoje.

## Como iniciar o dia

1. Verifique o health:

   ```bash
   curl http://127.0.0.1:3001/health
   ```

2. Leia o status executivo:

   ```bash
   pnpm gmv:status
   ```

3. Veja o estado da fila:

   ```bash
   pnpm gmv:queue
   ```

4. Gere um report executivo rapido:

   ```bash
   pnpm gmv:report
   ```

## Como verificar saude do runtime

### API

- `/health` deve responder `ok: true`
- `queueDriver` deve bater com o `.env`
- `notion.enabled` deve bater com as credenciais disponiveis

### Fila

Use:

```bash
pnpm gmv:queue
pnpm exec tsx bin/gmv.ts queue:failed
```

Sinais de alerta:

- filas crescendo sem consumo
- jobs falhos recorrentes
- erro de conexao com `DATABASE_URL`

## Como ver filas e falhas

### Stats

```bash
pnpm gmv:queue
```

### Falhas

```bash
pnpm exec tsx bin/gmv.ts queue:failed --job-name "planning.sync-from-notion"
```

### Retry manual

```bash
pnpm exec tsx bin/gmv.ts queue:retry --job-name "planning.sync-from-notion" --job-id "<job-id>"
```

## Como validar sync do Notion

1. Confirme que o adapter esta ativo no `/health`.
2. Rode:

   ```bash
   pnpm gmv:sync
   ```

3. Confirme:

- ausencia de erro de adapter desabilitado
- itens sincronizados aparecem nos boards e task list
- stories `ready` aparecem em `docs/stories`

## Como gerar report executivo

### Leitura imediata

```bash
pnpm gmv:report
```

### Snapshot manual

```bash
pnpm gmv:report:generate
```

### Historico

```bash
pnpm gmv:report:history
```

## Como agir em incidentes

### Sintoma: `/health` falha

Cheque:

- processo parado
- porta ocupada
- `.env` invalido
- logs do sistema

### Sintoma: `notion.enabled: false`

Quase sempre e ambiente:

- `NOTION_TOKEN` ausente
- algum `NOTION_*_DATABASE_ID` ausente
- data source errada ou sem permissao

### Sintoma: queue live nao sobe

Cheque:

- `DATABASE_URL`
- `QUEUE_DRIVER=pg-boss`
- conectividade com PostgreSQL
- SSL do provider

### Sintoma: API sobe, mas dados somem depois de restart

Cheque:

- caminho de `GMV_STATE_FILE`
- permissao de escrita no host
- backup e restauracao do arquivo

### Sintoma: status parece vazio, mas o sistema nao caiu

Cheque:

- missao foi criada?
- Notion foi refinado antes do sync?
- o ambiente esta rodando sem credenciais live?

## Rotina de fechamento

1. Rode `pnpm gmv:report`.
2. Confirme que `runtime-state.json` esta sendo atualizado.
3. Garanta backup do state file e do `.env`.
4. Registre qualquer incidente recorrente antes do proximo deploy.
