# Notion Live Validation Evidence

## Scope

This document captures the live validation evidence for stories `1.3`, `1.4`, `1.5` and `2.4` using the existing Notion parent page shared by the user:

- Parent page: `GMV Educacao e Tech`
- Existing workspace sections used: `Projetos` and `Metas`

The runtime uses the canonical Notion data sources provisioned inside those existing sections:

- `Projects`: `31ef1de2-f659-8175-9ba7-000b96ca6b4f`
- `Epics`: `31ef1de2-f659-81cb-b92a-000b8abcffd7`
- `Stories`: `31ef1de2-f659-815c-b9c5-000bef5c1f04`
- `Tasks`: `31ef1de2-f659-81f3-836f-000b8a9a3ec3`

## Validation Mission

- Mission id: `0b52f4af-1b1b-44f4-be90-1d0f9e89726a`
- Mission title: `AIOX Live Planning Flow Validation`
- Project page: [AIOX Live Planning Flow Validation](https://www.notion.so/AIOX-Live-Planning-Flow-Validation-31ef1de2f65981bd9367f049556d90e5)

## Live Planning Tree

- Project: [AIOX Live Planning Flow Validation](https://www.notion.so/AIOX-Live-Planning-Flow-Validation-31ef1de2f65981bd9367f049556d90e5)
- Epic: [Epic Live Validation - Marketing Engine](https://www.notion.so/Epic-Live-Validation-Marketing-Engine-31ef1de2f65981948271f96fd574d486)
- Story: [Story Live Validation - Social Campaign Narrative](https://www.notion.so/Story-Live-Validation-Social-Campaign-Narrative-31ef1de2f6598124a483dca0dc058d85)
- Task: [Task Live Validation - Draft Social Script Outline](https://www.notion.so/Task-Live-Validation-Draft-Social-Script-Outline-31ef1de2f659815fb637c4fbeec6a363)

## Runtime Evidence

The following runtime validations were executed successfully:

1. `npx tsx bin/gmv.ts mission:create --title "AIOX Live Planning Flow Validation" --objective "..."`
2. `npx tsx bin/gmv.ts sync`
3. `npx tsx bin/gmv.ts tasks:list --mission-id "0b52f4af-1b1b-44f4-be90-1d0f9e89726a"`
4. `npx tsx bin/gmv.ts status`
5. `GET /api/missions/0b52f4af-1b1b-44f4-be90-1d0f9e89726a`
6. `GET /api/tasks?missionId=0b52f4af-1b1b-44f4-be90-1d0f9e89726a`
7. `npx tsx bin/gmv.ts approval:create --planning-item-id "task-live-social-script-outline" --requested-by "openclaw" --approver "vitor-perin" --approval-type "quality_gate"`
8. `npx tsx bin/gmv.ts validation:create --planning-item-id "task-live-social-script-outline" --validator "chief-quality-agent" --validation-type "quality" --status "passed" --findings "Ready for go-live"`
9. `npx tsx bin/gmv.ts approval:decision --approval-id "0001079b-be06-4667-b0e1-c0340baaf540" --status "approved" --decision-notes "Ship it."`
10. `npx tsx bin/gmv.ts sync:governance --planning-item-id "task-live-social-script-outline"`

Observed outcomes:

- mission projection wrote `notionProjectPageId` and `notionProjectUrl` back to runtime state
- the synced planning tree preserved `project -> epic -> story -> task` hierarchy
- the `story` row with `Planning Status = ready` mirrored locally to [story-live-ready-social-campaign.story.md](C:/Users/Pichau/Desktop/GMV%20IA%20First/docs/stories/story-live-ready-social-campaign.story.md)
- `GET /api/missions/:missionId` returned planning items with live `externalUrl` fields
- `GET /api/tasks` resolved the owner to `Marketing Squad` and exposed the live Notion URL on the task row
- executive and sector boards reflected the live planning items after sync
- governance sync-back updated the live task page with:
  - `Validation Status = passed`
  - `Validation Type = quality`
  - `Validation Findings = Ready for go-live`
  - `Approval Status = approved`
  - `Approval Type = quality_gate`
  - `Approval Notes = Ship it.`
- the current live schema stores `Validation Type` and `Approval Type` as `Rich text`, and the adapter successfully wrote to that schema

## Story Closeout

- `1.3`: live mission-to-project projection validated
- `1.4`: live refinement into `Epics`, `Stories` and `Tasks` validated, including story mirror
- `1.5`: live drilldown and dashboard links validated against Notion-backed planning items
- `2.4`: live validation and approval results synced back into the Notion task page

## Executive Reporting Evidence

The recurring reporting slice was validated with live runtime data and Notion-linked objects:

1. `npm run gmv:report`
2. `npm run gmv:report:generate`
3. `npm run gmv:report:history`

Observed outcomes:

- the executive report returned live `metricLinks` for missions, planning items, validations and workflow runs
- `bySector` and `byProcessType` now expose explicit references back to synced Notion objects
- the snapshot history persisted locally and returned multiple generated snapshots in descending chronological order
- recurring generation is now configurable through `EXECUTIVE_REPORT_INTERVAL_MINUTES` on the API runtime

## Remaining Live Scope

No additional live Notion validation is required to satisfy the current PRD backlog.
