import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { Client } from "@notionhq/client";
import type { RuntimeConfig } from "@gmv/config";
import type {
  Mission,
  NotionPlanningSnapshot,
  PlanningItem
} from "@gmv/contracts";
import { notionPlanningSnapshotSchema, planningItemSchema } from "@gmv/contracts";

type RawNotionPage = {
  id: string;
  url?: string;
  properties?: Record<string, unknown>;
};

type PlanningProjection = {
  pageId: string;
  url: string;
};

type MappedPlanningItem = PlanningItem & {
  parentNotionPageId?: string;
};

export type PlanningSystemGovernanceSyncInput = {
  planningItemId: string;
  notionPageId?: string | null;
  kind: PlanningItem["kind"];
  planningStatus: PlanningItem["planningStatus"];
  executionStatus: PlanningItem["executionStatus"];
  validationNeeded: boolean;
  validationStatus?: "pending" | "passed" | "failed" | "warning" | null;
  validationType?: string | null;
  validationFindings: string[];
  approvalStatus?: "pending" | "approved" | "rejected" | "superseded" | null;
  approvalType?: string | null;
  approvalNotes?: string | null;
};

export type PlanningSystemGovernanceSyncResult = {
  updated: string[];
  skipped: Array<{
    planningItemId: string;
    reason: string;
  }>;
};

export interface PlanningSystemAdapter {
  enabled: boolean;
  getStatus(): { enabled: boolean; reason?: string };
  projectMission(mission: Mission): Promise<PlanningProjection>;
  pullPlanningSnapshot(): Promise<NotionPlanningSnapshot>;
  syncGovernanceState(
    items: PlanningSystemGovernanceSyncInput[]
  ): Promise<PlanningSystemGovernanceSyncResult>;
}

export interface StoryMirror {
  mirrorReadyStories(items: PlanningItem[]): Promise<{
    mirrored: string[];
    skipped: string[];
  }>;
}

class DisabledPlanningSystemAdapter implements PlanningSystemAdapter {
  public readonly enabled = false;

  getStatus(): { enabled: boolean; reason: string } {
    return {
      enabled: false,
      reason:
        "Notion integration is disabled. Configure NOTION_TOKEN and the four canonical planning IDs."
    };
  }

  async projectMission(): Promise<PlanningProjection> {
    throw new Error(this.getStatus().reason);
  }

  async pullPlanningSnapshot(): Promise<NotionPlanningSnapshot> {
    throw new Error(this.getStatus().reason);
  }

  async syncGovernanceState(): Promise<PlanningSystemGovernanceSyncResult> {
    throw new Error(this.getStatus().reason);
  }
}

class NotionPlanningSystemAdapter implements PlanningSystemAdapter {
  public readonly enabled = true;
  private readonly client: Client;

  constructor(private readonly config: RuntimeConfig) {
    this.client = new Client({ auth: config.NOTION_TOKEN });
  }

  getStatus(): { enabled: boolean } {
    return { enabled: true };
  }

  async projectMission(mission: Mission): Promise<PlanningProjection> {
    const result = await this.client.pages.create({
      parent: {
        data_source_id: this.config.NOTION_PROJECTS_DATABASE_ID!
      },
      properties: {
        Name: titleProperty(mission.title),
        "Runtime ID": richTextProperty(mission.id),
        "Mission ID": richTextProperty(mission.id),
        Owner: richTextProperty(mission.ownerAgentId),
        Sector: selectProperty("operations"),
        Priority: selectProperty(mission.priority),
        "Process Type": selectProperty(mission.processType),
        "Planning Status": selectProperty("backlog"),
        "Execution Status": selectProperty("not_started"),
        "Context Summary": richTextProperty(mission.objective),
        "Acceptance Criteria": richTextProperty(
          mission.successCriteria.join(" | ")
        )
      }
    });

    return {
      pageId: result.id,
      url: "url" in result ? (result.url ?? "") : ""
    };
  }

  async pullPlanningSnapshot(): Promise<NotionPlanningSnapshot> {
    const projects = await this.queryDatabase(
      this.config.NOTION_PROJECTS_DATABASE_ID!,
      "project"
    );
    const epics = await this.queryDatabase(
      this.config.NOTION_EPICS_DATABASE_ID!,
      "epic"
    );
    const stories = await this.queryDatabase(
      this.config.NOTION_STORIES_DATABASE_ID!,
      "story"
    );
    const tasks = await this.queryDatabase(
      this.config.NOTION_TASKS_DATABASE_ID!,
      "task"
    );

    const items = [...projects, ...epics, ...stories, ...tasks];
    const byNotionPageId = new Map(items.map((item) => [item.notionPageId, item.id]));
    const normalized = items.map(({ parentNotionPageId, ...item }) =>
      planningItemSchema.parse({
        ...item,
        parentId: parentNotionPageId ? byNotionPageId.get(parentNotionPageId) ?? null : null
      })
    );

    return notionPlanningSnapshotSchema.parse({ items: normalized });
  }

  async syncGovernanceState(
    items: PlanningSystemGovernanceSyncInput[]
  ): Promise<PlanningSystemGovernanceSyncResult> {
    const updated: string[] = [];
    const skipped: PlanningSystemGovernanceSyncResult["skipped"] = [];

    for (const item of items) {
      const pageId =
        item.notionPageId ?? (await this.resolvePageId(item.kind, item.planningItemId));

      if (!pageId) {
        skipped.push({
          planningItemId: item.planningItemId,
          reason: "Matching Notion page not found for Runtime ID."
        });
        continue;
      }

      await this.client.pages.update({
        page_id: pageId,
        properties: {
          "Planning Status": selectProperty(item.planningStatus),
          "Execution Status": selectProperty(item.executionStatus),
          "Validation Needed": checkboxProperty(item.validationNeeded),
          "Validation Status": nullableSelectProperty(item.validationStatus ?? null),
          "Validation Type": optionalRichTextProperty(item.validationType ?? ""),
          "Validation Findings": optionalRichTextProperty(
            item.validationFindings.join("\n")
          ),
          "Approval Status": nullableSelectProperty(item.approvalStatus ?? null),
          "Approval Type": optionalRichTextProperty(item.approvalType ?? ""),
          "Approval Notes": optionalRichTextProperty(item.approvalNotes ?? "")
        }
      });

      updated.push(item.planningItemId);
    }

    return {
      updated,
      skipped
    };
  }

  private async queryDatabase(
    databaseId: string,
    kind: PlanningItem["kind"]
  ): Promise<MappedPlanningItem[]> {
    const response = await this.client.dataSources.query({
      data_source_id: databaseId
    });

    return response.results
      .filter(
        (page) => typeof page === "object" && page !== null && "properties" in page
      )
      .map((page) => mapPlanningItem(page as unknown as RawNotionPage, kind));
  }

  private async resolvePageId(
    kind: PlanningItem["kind"],
    runtimeId: string
  ): Promise<string | null> {
    const response = await this.client.dataSources.query({
      data_source_id: this.getDataSourceId(kind),
      filter: {
        property: "Runtime ID",
        rich_text: {
          equals: runtimeId
        }
      } as never
    });

    const page = response.results.find(
      (candidate) => typeof candidate === "object" && candidate !== null && "id" in candidate
    ) as { id: string } | undefined;

    return page?.id ?? null;
  }

  private getDataSourceId(kind: PlanningItem["kind"]): string {
    if (kind === "project") {
      return this.config.NOTION_PROJECTS_DATABASE_ID!;
    }

    if (kind === "epic") {
      return this.config.NOTION_EPICS_DATABASE_ID!;
    }

    if (kind === "story") {
      return this.config.NOTION_STORIES_DATABASE_ID!;
    }

    return this.config.NOTION_TASKS_DATABASE_ID!;
  }
}

export class DiskStoryMirror implements StoryMirror {
  constructor(private readonly rootDir: string) {}

  async mirrorReadyStories(items: PlanningItem[]): Promise<{
    mirrored: string[];
    skipped: string[];
  }> {
    await mkdir(this.rootDir, { recursive: true });

    const mirrored: string[] = [];
    const skipped: string[] = [];

    for (const item of items) {
      if (item.kind !== "story") {
        continue;
      }

      const ready =
        item.planningStatus === "ready" &&
        item.contextSummary.trim().length > 0 &&
        item.acceptanceCriteria.length > 0;

      if (!ready) {
        skipped.push(item.id);
        continue;
      }

      const filePath = path.join(this.rootDir, `${item.id}.story.md`);
      await writeFile(filePath, renderStoryMarkdown(item), "utf8");
      mirrored.push(filePath);
    }

    return { mirrored, skipped };
  }
}

export function createPlanningSystemAdapter(
  config: RuntimeConfig
): PlanningSystemAdapter {
  if (!config.notionEnabled) {
    return new DisabledPlanningSystemAdapter();
  }

  return new NotionPlanningSystemAdapter(config);
}

function mapPlanningItem(
  page: RawNotionPage,
  kind: PlanningItem["kind"]
): MappedPlanningItem {
  const properties = page.properties ?? {};
  const now = new Date().toISOString();
  const relationField =
    kind === "epic"
      ? "Project"
      : kind === "story"
        ? "Epic"
        : kind === "task"
          ? "Story"
          : undefined;

  return {
    id: extractText(properties, "Runtime ID") || page.id,
    missionId: extractText(properties, "Mission ID") || "unknown-mission",
    notionPageId: page.id,
    kind,
    title: extractText(properties, "Name") || `${kind}-${page.id.slice(0, 8)}`,
    description: extractText(properties, "Description"),
    sector: normalizeSector(extractText(properties, "Sector")),
    priority: normalizePriority(extractText(properties, "Priority")),
    processType: normalizeProcessType(extractText(properties, "Process Type")),
    planningStatus: normalizePlanningStatus(
      extractText(properties, "Planning Status")
    ),
    executionStatus: normalizeExecutionStatus(
      extractText(properties, "Execution Status")
    ),
    ownerAgentId: extractText(properties, "Owner") || null,
    externalUrl: page.url,
    contextSummary: extractText(properties, "Context Summary"),
    acceptanceCriteria: splitMultiLine(
      extractText(properties, "Acceptance Criteria")
    ),
    dependencies: splitMultiLine(extractText(properties, "Dependencies")),
    inputSummary: extractText(properties, "Input Summary"),
    expectedOutput: extractText(properties, "Expected Output"),
    validationNeeded: extractCheckbox(properties, "Validation Needed"),
    createdAt: now,
    updatedAt: now,
    parentNotionPageId: relationField
      ? extractRelation(properties, relationField)
      : undefined
  };
}

function renderStoryMarkdown(item: PlanningItem): string {
  const acceptance = item.acceptanceCriteria
    .map((criterion: string) => `- [ ] ${criterion}`)
    .join("\n");
  const dependencies =
    item.dependencies.length > 0
      ? item.dependencies
          .map((dependency: string) => `- ${dependency}`)
          .join("\n")
      : "- Nenhuma dependência registrada.";

  return `# Story ${item.id}: ${item.title}

**ID:** ${item.id}
**Source:** Notion mirror
**Priority:** ${item.priority}
**Status:** Ready
**Mission ID:** ${item.missionId}

---

## User Story

**Como** operador ou squad da GMV,
**Quero** executar a story sincronizada do Notion,
**Para que** o desenvolvimento siga o backlog canônico da operação.

---

## Context

${item.contextSummary || "Contexto não informado."}

---

## Acceptance Criteria

${acceptance}

---

## Dependencies

${dependencies}

---

## Dev Notes

- Fonte canônica: Notion
- Execution Status atual: ${item.executionStatus}
- Validation needed: ${item.validationNeeded ? "yes" : "no"}

---

## QA Results

Pendente implementação e revisão.
`;
}

function extractText(
  properties: Record<string, unknown>,
  propertyName: string
): string {
  const property = properties[propertyName] as
    | {
        type?: string;
        title?: Array<{ plain_text?: string }>;
        rich_text?: Array<{ plain_text?: string }>;
        select?: { name?: string };
        status?: { name?: string };
        checkbox?: boolean;
      }
    | undefined;

  if (!property) {
    return "";
  }

  if (property.type === "title") {
    return (property.title ?? []).map((item) => item.plain_text ?? "").join("");
  }

  if (property.type === "rich_text") {
    return (property.rich_text ?? [])
      .map((item) => item.plain_text ?? "")
      .join("");
  }

  if (property.type === "select") {
    return property.select?.name ?? "";
  }

  if (property.type === "status") {
    return property.status?.name ?? "";
  }

  return "";
}

function extractCheckbox(
  properties: Record<string, unknown>,
  propertyName: string
): boolean {
  const property = properties[propertyName] as
    | {
        checkbox?: boolean;
      }
    | undefined;

  return property?.checkbox ?? false;
}

function extractRelation(
  properties: Record<string, unknown>,
  propertyName: string
): string | undefined {
  const property = properties[propertyName] as
    | {
        relation?: Array<{ id: string }>;
      }
    | undefined;

  return property?.relation?.[0]?.id;
}

function splitMultiLine(value: string): string[] {
  return value
    .split(/\r?\n| \| /)
    .map((item) => item.trim())
    .filter(Boolean);
}

function normalizeSector(value: string): PlanningItem["sector"] {
  const normalized = value.trim().toLowerCase();

  return normalized.length > 0 ? normalized : "operations";
}

function normalizePriority(value: string): PlanningItem["priority"] {
  if (
    value === "low" ||
    value === "medium" ||
    value === "high" ||
    value === "critical"
  ) {
    return value;
  }

  return "medium";
}

function normalizeProcessType(value: string): PlanningItem["processType"] {
  if (
    value === "strategic" ||
    value === "operational" ||
    value === "optimization" ||
    value === "governance"
  ) {
    return value;
  }

  return "operational";
}

function normalizePlanningStatus(
  value: string
): PlanningItem["planningStatus"] {
  if (
    value === "backlog" ||
    value === "refining" ||
    value === "ready" ||
    value === "in_progress" ||
    value === "waiting_validation" ||
    value === "done" ||
    value === "cancelled"
  ) {
    return value;
  }

  return "backlog";
}

function normalizeExecutionStatus(
  value: string
): PlanningItem["executionStatus"] {
  if (
    value === "not_started" ||
    value === "queued" ||
    value === "running" ||
    value === "blocked" ||
    value === "completed" ||
    value === "failed"
  ) {
    return value;
  }

  return "not_started";
}

function titleProperty(content: string): {
  title: Array<{ text: { content: string } }>;
} {
  return {
    title: [{ text: { content } }]
  };
}

function richTextProperty(content: string): {
  rich_text: Array<{ text: { content: string } }>;
} {
  return {
    rich_text: [{ text: { content } }]
  };
}

function optionalRichTextProperty(content: string): {
  rich_text: Array<{ text: { content: string } }>;
} {
  if (!content.trim()) {
    return { rich_text: [] };
  }

  return richTextProperty(content);
}

function selectProperty(name: string): {
  select: { name: string };
} {
  return {
    select: { name }
  };
}

function nullableSelectProperty(name: string | null): {
  select: { name: string } | null;
} {
  return {
    select: name ? { name } : null
  };
}

function checkboxProperty(value: boolean): {
  checkbox: boolean;
} {
  return {
    checkbox: value
  };
}
