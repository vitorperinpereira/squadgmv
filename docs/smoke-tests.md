# Smoke Tests

## Objetivo

Este e o roteiro curto e canonico para validar se um ambiente novo esta saudavel o bastante para operar o MVP.

## Smoke test local

### Passos

```bash
pnpm install
pnpm lint
pnpm typecheck
pnpm test
pnpm gmv:status
```

### Esperado

- dependencias instaladas sem drift
- lint sem erro
- typecheck sem erro
- testes passando
- `pnpm gmv:status` retornando JSON com blocos `executive` e `sectors`

### Opcional, mas util

```bash
pnpm gmv:report
```

Esperado:

- relatorio executivo retornando sem crash
- `missingData` coerente com o ambiente atual

## Smoke test live minimo

### Pre-requisitos

- `.env` preenchido com `NOTION_*`
- `DATABASE_URL` configurada se a validacao incluir `pg-boss`
- workspace do Notion com `Projects`, `Epics`, `Stories` e `Tasks`

### Passos

1. Suba a API:

   ```bash
   pnpm dev:api
   ```

2. Crie uma missao:

   ```bash
   pnpm exec tsx bin/gmv.ts mission:create --title "Smoke mission" --objective "Validar pipeline minimo do runtime"
   ```

3. Confirme no Notion que o projeto foi criado.

4. No Notion, refine manualmente pelo menos:

- `1` epic
- `1` story com `Planning Status = ready`
- `1` task ligada a essa story

5. Rode o sync:

   ```bash
   pnpm gmv:sync
   ```

6. Liste as tasks:

   ```bash
   pnpm exec tsx bin/gmv.ts tasks:list
   ```

7. Gere o report executivo:

   ```bash
   pnpm gmv:report
   ```

### Esperado

- projeto visivel no Notion
- sync retornando sucesso sem erro de adapter desabilitado
- task list expondo itens com links externos do Notion
- report executivo retornando sem erro

## Triagem rapida: ambiente ou codigo?

### Suspeite primeiro de ambiente quando

- `/health` mostrar `notion.enabled: false`
- `QUEUE_DRIVER=pg-boss` estiver sem `DATABASE_URL`
- Notion existir, mas as quatro data sources nao tiverem o schema esperado
- o runtime subir localmente, mas falhar so no VPS

### Suspeite de codigo quando

- o mesmo ambiente reproduz falha com `.env` completo e schema valido
- a suite local falhar antes de chegar no passo live
- o runtime quebrar com `QUEUE_DRIVER=inline` e `STATE_DRIVER=file`

## Evidencia recomendada para fechar validacao

- resposta de `pnpm gmv:status`
- resposta de `pnpm gmv:report`
- URL do projeto live no Notion
- caminho do story mirror em `docs/stories`
- resultado de `pnpm test`
