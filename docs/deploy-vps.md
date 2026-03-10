# Deploy VPS

## Escopo

Playbook de deploy reproduzivel para uma VPS Linux rodando o runtime da GMV.

Assuncao usada neste documento:

- Ubuntu 24.04 ou equivalente
- `systemd`
- checkout direto do repo
- Node.js via `corepack`

## Topologia recomendada hoje

Enquanto o runtime repository continuar file-backed, a topologia canonica para VPS e:

- `1` processo de API em modo `combined`
- `QUEUE_DRIVER=inline` para o caminho mais simples
- ou `QUEUE_DRIVER=pg-boss` se voce quiser fila duravel, mas ainda no mesmo processo

Nao trate `api + worker` separados como topologia padrao do repo atual. O split so fica realmente coerente quando existir repository de runtime em PostgreSQL.

## Matriz de topologias

| Topologia | Quando usar | Variaveis | Observacao |
| --- | --- | --- | --- |
| API unica + `inline` | deploy mais simples | `STATE_DRIVER=file`, `QUEUE_DRIVER=inline` | menor atrito |
| API unica + `pg-boss` | fila duravel sem split | `STATE_DRIVER=file`, `QUEUE_DRIVER=pg-boss`, `DATABASE_URL` | recomendacao atual para VPS mais seria |
| API + worker split | proximo slice | `STATE_DRIVER=postgres` | nao canonico no repo atual |

## Pre-requisitos

- Git
- Node.js 24.x
- `corepack` habilitado
- `pnpm`
- usuario de sistema para o app
- acesso ao repo

## Layout de diretorios sugerido

```text
/opt/squadgmv/app
/opt/squadgmv/shared/.env
/var/lib/squadgmv/runtime-state.json
```

## Bootstrap do host

```bash
sudo mkdir -p /opt/squadgmv /var/lib/squadgmv
sudo chown -R $USER:$USER /opt/squadgmv /var/lib/squadgmv
git clone <repo> /opt/squadgmv/app
cd /opt/squadgmv/app
corepack enable
pnpm install --frozen-lockfile
pnpm lint
pnpm typecheck
pnpm test
```

## `.env`

Salve o arquivo em `/opt/squadgmv/shared/.env` e aponte o state file para fora do checkout:

```env
NODE_ENV=production
PORT=3001
LOG_LEVEL=info
STATE_DRIVER=file
QUEUE_DRIVER=inline
EXECUTIVE_REPORT_INTERVAL_MINUTES=0
GMV_STATE_FILE=/var/lib/squadgmv/runtime-state.json
STORY_MIRROR_DIR=/opt/squadgmv/app/docs/stories
DATABASE_SSL_REJECT_UNAUTHORIZED=true
```

### Quando ativar Notion live

Adicione:

- `NOTION_TOKEN`
- `NOTION_PROJECTS_DATABASE_ID`
- `NOTION_EPICS_DATABASE_ID`
- `NOTION_STORIES_DATABASE_ID`
- `NOTION_TASKS_DATABASE_ID`

### Quando ativar `pg-boss`

Adicione:

- `DATABASE_URL`
- `QUEUE_DRIVER=pg-boss`

## API

### Unit file sugerido

```ini
[Unit]
Description=squadgmv api
After=network.target

[Service]
Type=simple
WorkingDirectory=/opt/squadgmv/app
EnvironmentFile=/opt/squadgmv/shared/.env
ExecStart=/usr/bin/env pnpm exec tsx apps/runtime/src/server.ts
Restart=always
RestartSec=5
User=%i

[Install]
WantedBy=multi-user.target
```

### Subir

```bash
sudo systemctl daemon-reload
sudo systemctl enable squadgmv-api.service
sudo systemctl start squadgmv-api.service
```

## Worker

O processo existe, mas nao e a recomendacao canonica para o deploy atual. Se voce ainda quiser prepara-lo para um proximo slice:

```ini
[Unit]
Description=squadgmv worker
After=network.target

[Service]
Type=simple
WorkingDirectory=/opt/squadgmv/app
EnvironmentFile=/opt/squadgmv/shared/.env
ExecStart=/usr/bin/env pnpm exec tsx apps/runtime/src/worker.ts
Restart=always
RestartSec=5
User=%i

[Install]
WantedBy=multi-user.target
```

Mantenha desabilitado enquanto `STATE_DRIVER=file`.

## Logs

```bash
journalctl -u squadgmv-api.service -f
```

Se o worker estiver habilitado:

```bash
journalctl -u squadgmv-worker.service -f
```

## Restart

```bash
sudo systemctl restart squadgmv-api.service
```

## Healthcheck

```bash
curl http://127.0.0.1:3001/health
```

Esperado:

- `ok: true`
- `queueDriver` coerente com o `.env`
- `notion.enabled` coerente com as credenciais
- `storage.driver: "file"`

## Backup

Hoje, o backup obrigatorio nao e so do banco:

- backup de `/opt/squadgmv/shared/.env`
- backup de `/var/lib/squadgmv/runtime-state.json`
- se estiver usando `pg-boss`, backup normal do PostgreSQL tambem

Sem backup do `runtime-state.json`, voce perde a persistencia canonica atual do runtime.

## Comandos uteis

```bash
cd /opt/squadgmv/app
pnpm gmv:status
pnpm gmv:sync
pnpm gmv:queue
pnpm gmv:report
pnpm gmv:queue:smoke
```

## Check final de deploy

1. `curl /health`
2. `pnpm gmv:status`
3. `pnpm gmv:report`
4. se houver Notion live, `pnpm gmv:sync`
5. se houver `pg-boss`, `pnpm gmv:queue`
