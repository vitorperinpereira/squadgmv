# Queue Operations

## Scope

This document captures the managed queue surface introduced for story `2.2`.

The runtime now supports:

- queue-backed planning reconcile
- queue retries and dead-letter behavior
- queue stats for operational monitoring
- queue failure inspection
- queue retry from CLI or API
- producer/consumer split when `QUEUE_DRIVER=pg-boss`
- a `pg-boss` smoke validation script for real PostgreSQL backends

## Queue Jobs

### `mission.project-to-notion`

- Purpose: project a mission into the canonical Notion `Projects` data source
- Retry policy: `retryLimit=3`, exponential backoff enabled
- Dead-letter queue: `mission-project-to-notion-dead-letter`

### `planning.sync-from-notion`

- Purpose: reconcile `Projects`, `Epics`, `Stories` and `Tasks` from Notion into the runtime
- Retry policy: `retryLimit=5`, exponential backoff enabled
- Dead-letter queue: `planning-sync-from-notion-dead-letter`

## Runtime Surfaces

### API

- `POST /api/sync/notion/reconcile`
  - now enqueues reconcile work and returns `202`
- `GET /api/queue/stats`
  - returns queue counts by queue name
- `GET /api/queue/failed`
  - lists failed and dead-lettered jobs
- `POST /api/queue/retry`
  - retries a failed job by `jobName` and `jobId`

### CLI

- `npx tsx bin/gmv.ts sync`
- `npx tsx bin/gmv.ts queue:stats`
- `npx tsx bin/gmv.ts queue:failed --job-name "planning.sync-from-notion"`
- `npx tsx bin/gmv.ts queue:retry --job-name "planning.sync-from-notion" --job-id "..."`

## Process Split

When `QUEUE_DRIVER=pg-boss`:

- if `STATE_DRIVER=postgres`, `apps/runtime/src/server.ts` starts in `producer` mode and `apps/runtime/src/worker.ts` starts in `consumer` mode
- if `STATE_DRIVER=file`, both runtimes fall back to `combined` mode and emit a warning

When `QUEUE_DRIVER=inline`:

- both processes can run in combined mode for local development and tests

This fallback exists because `producer/consumer` split with file-backed state is not safe for a multi-process runtime.

## Auditability

Queue execution is recorded in `workflow_runs` with:

- `queueJobId`
- `jobName`
- `attempt`
- `status`
- `correlationId`

The runtime records queue stages as:

- `queued`
- `running`
- `succeeded`
- `failed`

## Live Validation

The queue code includes an executable smoke validator:

- `npm run gmv:queue:smoke`

This smoke validator:

- creates a real `pg-boss` queue
- forces one dead-letter path
- replays the dead-letter job
- validates runtime-backed `planning.sync-from-notion` execution through the queue

Story `2.2` was closed after running this validation against Supabase PostgreSQL with `DATABASE_URL` set to the live project database. The live execution confirmed:

- queue creation and worker consumption in `pg-boss`
- failed job registration in the source queue
- dead-letter creation and replay
- runtime reconcile through `planning.sync-from-notion`
- successful workflow correlation via `workflow_runs`

Additional hardening applied during live validation:

- Supabase hosts now strip `sslmode` from the connection string when explicit SSL handling is injected into `pg-boss`
- queue create/update paths now sanitize `undefined` options before calling `pg-boss`
