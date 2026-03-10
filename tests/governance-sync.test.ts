import { describe, expect, it } from "vitest";
import { buildRuntimeApp } from "../apps/runtime/src/app.js";
import { createRuntimeContext } from "../apps/runtime/src/bootstrap.js";
import type {
  Mission,
  NotionPlanningSnapshot,
  PlanningItem
} from "@gmv/contracts";
import type {
  PlanningSystemAdapter,
  PlanningSystemGovernanceSyncInput
} from "@gmv/notion-adapter";
import { createTempPaths, createTestConfig } from "./test-helpers.js";

describe("governance sync-back", () => {
  it("syncs validation and approval state back through the planning adapter", async () => {
    const paths = await createTempPaths("gmv-governance-sync-");
    const capturedSyncPayloads: PlanningSystemGovernanceSyncInput[][] = [];
    const adapter: PlanningSystemAdapter = {
      enabled: true,
      getStatus() {
        return { enabled: true };
      },
      async projectMission(mission: Mission) {
        return {
          pageId: `notion-${mission.id}`,
          url: `https://notion.local/${mission.id}`
        };
      },
      async pullPlanningSnapshot(): Promise<NotionPlanningSnapshot> {
        return { items: [] };
      },
      async syncGovernanceState(items: PlanningSystemGovernanceSyncInput[]) {
        capturedSyncPayloads.push(items);
        return {
          updated: items.map((item) => item.planningItemId),
          skipped: []
        };
      }
    };

    const context = await createRuntimeContext({
      config: createTestConfig(paths),
      planningAdapter: adapter
    });
    const app = await buildRuntimeApp(context);
    const agents = await context.agentDirectoryService.listAgents();
    const openclaw = agents.find((agent) => agent.slug === "openclaw");
    const founder = agents.find((agent) => agent.slug === "vitor-perin");

    const planningItem: PlanningItem = {
      id: "task-governance-sync",
      missionId: "mission-governance-sync",
      parentId: null,
      notionPageId: "notion-task-governance-sync",
      kind: "task",
      title: "Governance Sync Task",
      description: "Task used to validate Notion sync-back for governance.",
      sector: "quality",
      priority: "high",
      processType: "governance",
      planningStatus: "waiting_validation",
      executionStatus: "blocked",
      ownerAgentId: founder?.id ?? null,
      externalUrl: "https://notion.local/task-governance-sync",
      contextSummary: "Validate sync-back of approval and validation state.",
      acceptanceCriteria: ["Sync-back reflects approval and validation fields."],
      dependencies: [],
      inputSummary: "Governance package",
      expectedOutput: "Notion fields updated",
      validationNeeded: true,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };

    await context.repository.upsertPlanningItems([planningItem]);
    const approvalCreateResponse = await app.inject({
      method: "POST",
      url: "/api/approvals",
      payload: {
        planning_item_id: planningItem.id,
        requested_by_agent: openclaw!.slug,
        approver_agent: founder!.slug,
        approval_type: "quality_gate"
      }
    });

    expect(approvalCreateResponse.statusCode).toBe(201);
    const approval = approvalCreateResponse.json().approval as { id: string };

    const validationResponse = await app.inject({
      method: "POST",
      url: "/api/validations",
      payload: {
        planning_item_id: planningItem.id,
        validator_agent: "chief-quality-agent",
        validation_type: "quality",
        status: "passed",
        findings: ["Ready for go-live"]
      }
    });

    expect(validationResponse.statusCode).toBe(201);
    expect(
      validationResponse.json().governanceSync.updated.includes(planningItem.id)
    ).toBe(true);

    const approvalDecisionResponse = await app.inject({
      method: "POST",
      url: `/api/approvals/${approval.id}/decision`,
      headers: {
        "x-gmv-role": "founder"
      },
      payload: {
        status: "approved",
        decision_notes: "Ship it."
      }
    });

    expect(approvalDecisionResponse.statusCode).toBe(200);
    expect(
      approvalDecisionResponse.json().governanceSync.updated.includes(
        planningItem.id
      )
    ).toBe(true);

    const manualSyncResponse = await app.inject({
      method: "POST",
      url: "/api/sync/notion/governance",
      payload: {
        planningItemId: planningItem.id
      }
    });

    expect(manualSyncResponse.statusCode).toBe(200);
    const latestPayload =
      capturedSyncPayloads[capturedSyncPayloads.length - 1]?.[0];

    expect(latestPayload?.planningItemId).toBe(planningItem.id);
    expect(latestPayload?.validationStatus).toBe("passed");
    expect(latestPayload?.approvalStatus).toBe("approved");
    expect(latestPayload?.approvalType).toBe("quality_gate");
    expect(latestPayload?.approvalNotes).toBe("Ship it.");

    await app.close();
  });
});
