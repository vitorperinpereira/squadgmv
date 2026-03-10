# Notion Live Contract

## Purpose

This document is the canonical integration contract between the GMV runtime and the live Notion workspace for the scope covered by stories 1.3, 1.4, 1.5 and 2.4.

It is derived from:

- `docs/architecture.md`
- `docs/framework/notion-model.md`
- `packages/notion-adapter/src/index.ts`
- `packages/contracts/src/index.ts`
- `packages/domain/src/index.ts`
- `packages/domain/src/business-flows.ts`
- `apps/runtime/src/bootstrap.ts`
- `docs/stories/1.3.story.md`
- `docs/stories/1.4.story.md`
- `docs/stories/1.5.story.md`
- `docs/stories/2.4.story.md`

## Source Of Truth Split

- Notion is the canonical source for planning structure and manual refinement of `Projects`, `Epics`, `Stories` and `Tasks`.
- The runtime is the canonical source for mission lifecycle, execution state, handoffs, approvals, validations, governance policies and audit history.
- The adapter is enabled only when all five live variables exist: `NOTION_TOKEN`, `NOTION_PROJECTS_DATABASE_ID`, `NOTION_EPICS_DATABASE_ID`, `NOTION_STORIES_DATABASE_ID`, `NOTION_TASKS_DATABASE_ID`.
- Even though the environment variables say `DATABASE_ID`, the live adapter currently queries Notion using `data_source_id`. The live workspace must therefore expose one canonical data source per database layer.
- `STORY_MIRROR_DIR` defaults to `docs/stories` and is the canonical local mirror target.

## Canonical Databases

| Notion database | Runtime `kind` | Canonical parent | Main author | Purpose |
| --- | --- | --- | --- | --- |
| `Projects` | `project` | none | OpenClaw and runtime projection | One top-level planning record per mission, with the Notion link stored back on the mission. |
| `Epics` | `epic` | `Projects` via `Project` relation | C-level owners | Breakdown of a project into sector or workflow slices. |
| `Stories` | `story` | `Epics` via `Epic` relation | C-level owners | Execution-ready work slices and the only records eligible for local story mirroring. |
| `Tasks` | `task` | `Stories` via `Story` relation | C-level owners and squads | Executable units that anchor handoffs, validations and most approvals. |

The database names above are part of the contract. The adapter is wired to four separate live IDs and does not discover alternate names.

## Core Property Contract

Property names are case-sensitive and must remain exact.

### Core Planning Properties

| Property | Notion type | Applies to | Required rule | Runtime field / behavior |
| --- | --- | --- | --- | --- |
| `Name` | `Title` | Projects, Epics, Stories, Tasks | Required on every row | Maps to `title`. Missing values fall back to synthetic names locally and are not valid in live. |
| `Runtime ID` | `Rich text` | Projects, Epics, Stories, Tasks | Required on every row | Maps to `id`. Missing values fall back to `page.id` locally and are not valid in live. |
| `Mission ID` | `Rich text` | Projects, Epics, Stories, Tasks | Required on every row | Maps to `missionId`. Missing values fall back to `unknown-mission` locally and are not valid in live. |
| `Description` | `Rich text` | Epics, Stories, Tasks | Optional for import, recommended for live | Maps to `description`. |
| `Owner` | `Rich text` | Projects, Epics, Stories, Tasks | Required on every row | Maps to `ownerAgentId`. The runtime treats this as an opaque identifier; production should standardize on the runtime agent id. |
| `Sector` | `Select` | Projects, Epics, Stories, Tasks | Required on every row | Maps to `sector`. Allowed values should stay within `marketing`, `sales`, `technology`, `brand`, `quality`, `operations`, `support`. |
| `Priority` | `Select` | Projects, Epics, Stories, Tasks | Required on every row | Maps to `priority`. Allowed values: `low`, `medium`, `high`, `critical`. |
| `Process Type` | `Select` | Projects, Epics, Stories, Tasks | Required on every row | Maps to `processType`. Allowed values: `strategic`, `operational`, `optimization`, `governance`. |
| `Planning Status` | `Select` | Projects, Epics, Stories, Tasks | Required on every row | Maps to `planningStatus`. Allowed values: `backlog`, `refining`, `ready`, `in_progress`, `waiting_validation`, `done`, `cancelled`. Use `Select`, not `Status`, because `projectMission()` writes `select` payloads. |
| `Execution Status` | `Select` | Projects, Epics, Stories, Tasks | Required on every row | Maps to `executionStatus`. Allowed values: `not_started`, `queued`, `running`, `blocked`, `completed`, `failed`. Use `Select`, not `Status`, for the same reason. |
| `Context Summary` | `Rich text` | Projects, Epics, Stories, Tasks | Required for Projects, Stories and Tasks; recommended for Epics | Maps to `contextSummary`. Empty values block story mirroring. |
| `Acceptance Criteria` | `Rich text` | Projects, Stories, Tasks | Required for Projects, Stories and Tasks; recommended for Epics | Maps to `acceptanceCriteria`. The adapter splits either new lines or ` | `. Empty values block story mirroring for stories. |
| `Dependencies` | `Rich text` | Epics, Stories, Tasks | Required when dependencies exist; otherwise empty string is allowed | Maps to `dependencies`. Serialized as new lines or ` | `. |
| `Input Summary` | `Rich text` | Tasks | Required on live task rows | Maps to `inputSummary`. |
| `Expected Output` | `Rich text` | Tasks | Required on live task rows | Maps to `expectedOutput`. |
| `Validation Needed` | `Checkbox` | Stories, Tasks | Required on live stories and tasks | Maps to `validationNeeded`. |

### Governance Sync-Back Extension

The fields below are required for live sync-back of story 2.4, but they are not read by `pullPlanningSnapshot()` today. They exist to keep runtime governance state visible in Notion without turning Notion into the runtime database.

| Property | Notion type | Applies to | Source in runtime |
| --- | --- | --- | --- |
| `Validation Status` | `Select` | Any project or task with a validation gate | `validation_results.status` plus derived `pending` when `Validation Needed = true` and no conclusive result exists yet |
| `Validation Type` | `Rich text` | Any project or task with a validation gate | `validation_results.validationType` |
| `Validation Findings` | `Rich text` | Any project or task with a validation gate | `validation_results.findings`, joined by new line |
| `Approval Status` | `Select` | Any project or task with an approval gate | `approval_decisions.status` |
| `Approval Type` | `Rich text` | Any project or task with an approval gate | `approval_decisions.approvalType` |
| `Approval Notes` | `Rich text` | Any project or task with an approval gate | `approval_decisions.decisionNotes` |

### Serialization Rules

- `Acceptance Criteria` and `Dependencies` must be serialized one entry per line or with ` | ` separators. The adapter supports both forms.
- `Owner`, `Runtime ID` and `Mission ID` must be plain text identifiers, not people properties, mentions or page references.
- Relation fields define hierarchy. Textual `Dependencies` do not replace parent relations.
- The adapter currently tolerates `select` and `status` on read, but live contract compliance should use the exact types listed above so create and update paths stay deterministic.

### Current Adapter Coverage

- `projectMission()` currently writes `Name`, `Runtime ID`, `Mission ID`, `Owner`, `Sector`, `Priority`, `Process Type`, `Planning Status`, `Execution Status`, `Context Summary` and `Acceptance Criteria` to `Projects`.
- `projectMission()` now seeds `Sector = operations` for projected projects so OpenClaw-owned missions remain contract-compliant even before manual refinement.
- `pullPlanningSnapshot()` currently reads the core planning fields, the canonical parent relation and `Validation Needed`. It does not read the governance sync-back extension yet.
- The governance sync-back fields in this contract are therefore required for live runtime -> Notion visibility, not for the current import path.

## Required Relations

The runtime does not infer hierarchy from page nesting. Only relation properties are authoritative.

| Child database | Required relation property | Parent database | Cardinality | Runtime behavior |
| --- | --- | --- | --- | --- |
| `Epics` | `Project` | `Projects` | Exactly 1 parent | Used to resolve `parentId` for `kind = epic`. |
| `Stories` | `Epic` | `Epics` | Exactly 1 parent | Used to resolve `parentId` for `kind = story`. |
| `Tasks` | `Story` | `Stories` | Exactly 1 parent | Used to resolve `parentId` for `kind = task`. |

Additional invariants:

- Every descendant row must carry the same `Mission ID` as its ancestor chain.
- A row with zero parents or more than one parent in its canonical relation field is invalid for live sync.
- `Dependencies` remain descriptive only. They do not participate in parent resolution.

## Formal Readiness Rule For Story Mirror

The current mirror implementation in `DiskStoryMirror` is equivalent to the predicate below:

```text
MirrorEligible(item) :=
  item.kind == "story"
  AND item.planningStatus == "ready"
  AND trim(item.contextSummary).length > 0
  AND item.acceptanceCriteria.length > 0
```

Operational consequences:

- If `MirrorEligible(item)` is true, the runtime writes `docs/stories/{Runtime ID}.story.md`.
- If `MirrorEligible(item)` is false, the story id is returned in `skipped`.
- `Dependencies`, `Input Summary`, `Expected Output` and `Validation Needed` are preserved in the normalized record but do not gate mirroring in code today.

Live contract addendum:

- A story must still have a valid `Epic` relation and a valid `Mission ID` before it is considered compliant for live mirror sign-off.
- Adapter fallback values such as synthetic title, `unknown-mission` or defaulted enums count as live validation failures even if the mirror file was generated.

## Sync-Back Mapping For Gates, Validations And Approvals

### Anchor Rule

- Every sync-back event targets the Notion row whose `Runtime ID` matches the runtime `planningItemId`.
- Task-scoped governance policies write back to a task page.
- Project-scoped governance policies write back to a project page.
- Handoffs do not create a fifth Notion database in the MVP. They remain runtime-native records linked indirectly through `planningItemId` and `Mission ID`.

### Mapping Table

| Runtime source | Notion target | Notion update |
| --- | --- | --- |
| `planning_items.planningStatus` | Matching project, epic, story or task page | Update `Planning Status` with the exact runtime enum. `waiting_validation` is the canonical coarse state for governance-blocked work. |
| `planning_items.executionStatus` | Matching project, epic, story or task page | Update `Execution Status` with the exact runtime enum. Execution state must stay separate from approval or validation outcome. |
| `planning_items.validationNeeded` | Matching story or task page | Update `Validation Needed` checkbox. |
| `handoffs.needsValidation = true` | Target task page of the handoff | Ensure `Validation Needed = true` before or along with governance sync-back. |
| `validation_results.status` | Project or task page referenced by `planningItemId` | Update `Validation Status`. Seeded warnings from governance policies must appear as `warning`; missing conclusive validation with `Validation Needed = true` must appear as `pending`. |
| `validation_results.validationType` | Same page as above | Update `Validation Type`. Examples already seeded in runtime: `brand`, `readiness`, `quality`. |
| `validation_results.findings` | Same page as above | Update `Validation Findings` as newline-joined text. |
| `approval_decisions.status` | Project or task page referenced by `planningItemId` | Update `Approval Status`. Pending approvals stay visible without overloading `Execution Status`. |
| `approval_decisions.approvalType` | Same page as above | Update `Approval Type`. Examples already seeded in runtime: `publication`, `funnel_review`, `quality_gate`. |
| `approval_decisions.decisionNotes` | Same page as above | Update `Approval Notes`. Empty string is valid before a decision, but the property must exist. |

### Flow-Specific Gate Anchors Already Present In Runtime

These are the current seeded governance anchors that the live workspace must be able to represent:

- Marketing validation gate: task `brand-review` -> `Validation Type = brand`
- Marketing approval gate: task `approval-package` -> `Approval Type = publication`
- Sales validation gate: task `sales-script-and-training-pack` -> `Validation Type = readiness`
- Sales approval gate: task `closing-follow-up-and-objection-log` -> `Approval Type = funnel_review`
- Technology validation gate: task `quality-validation-and-go-live-brief` -> `Validation Type = quality`
- Technology approval gate: project scope -> `Approval Type = quality_gate`

## Adapter Fallbacks That Must Not Pass Live Validation

The adapter is permissive today so local development can continue without a perfect workspace. Live validation must reject every case below:

| Invalid live input | Current local fallback | Live ruling |
| --- | --- | --- |
| Missing `Runtime ID` | Uses Notion `page.id` | Fail validation |
| Missing `Mission ID` | Uses `unknown-mission` | Fail validation |
| Missing `Name` | Uses `{kind}-{pageIdPrefix}` | Fail validation |
| Invalid or missing `Sector` | Uses `operations` | Fail validation |
| Invalid or missing `Priority` | Uses `medium` | Fail validation |
| Invalid or missing `Process Type` | Uses `operational` | Fail validation |
| Invalid or missing `Planning Status` | Uses `backlog` | Fail validation |
| Invalid or missing `Execution Status` | Uses `not_started` | Fail validation |
| Missing `Validation Needed` on story or task | Uses `false` | Fail validation |
| Missing canonical parent relation | Uses `null` parentId | Fail validation |

## Live Validation Checklist

- [ ] Confirm the live workspace exposes exactly four canonical planning data sources: `Projects`, `Epics`, `Stories`, `Tasks`.
- [ ] Confirm the runtime has `NOTION_TOKEN` plus all four `NOTION_*_DATABASE_ID` variables and that each id resolves to the intended live data source.
- [ ] Confirm every canonical property exists with the exact name and Notion type defined in this document.
- [ ] Confirm `Planning Status` and `Execution Status` use the exact runtime enum values and are configured as `Select`.
- [ ] Confirm `Project`, `Epic` and `Story` relations exist, are single-parent and line up with the canonical database chain.
- [ ] Confirm every live row has `Runtime ID`, `Mission ID`, `Owner`, `Sector`, `Priority`, `Process Type`, `Planning Status` and `Execution Status` populated without relying on adapter fallbacks.
- [ ] Create a mission through the runtime, project it to Notion and verify the mission is updated with `notionProjectPageId` and `notionProjectUrl`.
- [ ] Refine one live project manually in Notion into at least one epic, one story and one task, then run `/api/sync/notion/reconcile` and verify hierarchy, ids and properties survive normalization.
- [ ] Mark one live story as `Planning Status = ready` with non-empty `Context Summary` and `Acceptance Criteria`, then verify the mirror file appears in `docs/stories`.
- [ ] Verify `/api/missions/:missionId`, `/api/boards/executive`, `/api/boards/sectors`, `/api/tasks` and `/api/reports/executive` all show the same live Notion-linked mission and planning item state.
- [ ] Bootstrap at least one gated flow and verify the target Notion page receives the governance sync-back fields defined in `Governance Sync-Back Extension`.
- [ ] Record one validation outcome and one approval decision live, then verify the target page shows updated `Validation Status` / `Approval Status` plus supporting fields.
- [ ] Capture evidence for QA closeout of stories 1.3, 1.4, 1.5 and 2.4: page URLs, runtime responses, mirror path and board/report snapshots.
