# GMV Coding Standards

## Core Principles

- `CLI First -> Observability Second -> UI Third`
- Stories live in `docs/stories/`
- Notion is canonical for planning; local stories are derived implementation artifacts
- Contracts and schemas must be explicit and versionable
- Important mutations must emit audit events and correlation IDs

## Implementation Rules

- Use TypeScript everywhere in the runtime foundation
- Keep business logic in `packages/domain`
- Keep third-party integrations behind adapters
- Validate all external input with shared Zod schemas
- Prefer deterministic, testable services over framework-heavy abstractions

## Operational Rules

- Every runtime write path must be observable
- Queue work must be retryable or explicitly fail with context
- Planning status and execution status are separate concerns
- Stories mirrored from Notion should only be generated when they are `Ready`
