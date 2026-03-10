import { readFile } from "node:fs/promises";
import { describe, expect, it } from "vitest";
import { createRuntimeContext } from "../apps/runtime/src/bootstrap.js";
import type { NotionPlanningSnapshot } from "@gmv/contracts";
import { createFakePlanningAdapter, createTempPaths, createTestConfig } from "./test-helpers.js";

describe("planning sync", () => {
  it("syncs planning items and mirrors ready stories to docs/stories", async () => {
    const paths = await createTempPaths("gmv-planning-sync-");
    const snapshot: NotionPlanningSnapshot = {
      items: [
        {
          id: "project-1",
          missionId: "mission-1",
          notionPageId: "page-project-1",
          kind: "project",
          title: "Marketing Project",
          description: "",
          sector: "marketing",
          priority: "high",
          processType: "strategic",
          planningStatus: "backlog",
          executionStatus: "not_started",
          ownerAgentId: "openclaw",
          externalUrl: "",
          contextSummary: "",
          acceptanceCriteria: [],
          dependencies: [],
          inputSummary: "",
          expectedOutput: "",
          validationNeeded: false,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString()
        },
        {
          id: "epic-1",
          missionId: "mission-1",
          parentId: "project-1",
          notionPageId: "page-epic-1",
          kind: "epic",
          title: "Editorial Engine",
          description: "",
          sector: "marketing",
          priority: "high",
          processType: "operational",
          planningStatus: "refining",
          executionStatus: "not_started",
          ownerAgentId: "cmo-agent",
          externalUrl: "",
          contextSummary: "",
          acceptanceCriteria: [],
          dependencies: [],
          inputSummary: "",
          expectedOutput: "",
          validationNeeded: false,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString()
        },
        {
          id: "story-1",
          missionId: "mission-1",
          parentId: "epic-1",
          notionPageId: "page-story-1",
          kind: "story",
          title: "Draft the weekly campaign narrative",
          description: "Ready story mirrored from the planning system.",
          sector: "marketing",
          priority: "high",
          processType: "operational",
          planningStatus: "ready",
          executionStatus: "not_started",
          ownerAgentId: "cmo-agent",
          externalUrl: "",
          contextSummary: "The content squad needs a campaign story for the week.",
          acceptanceCriteria: [
            "Narrative approved by the marketing lead",
            "Story has enough context for execution"
          ],
          dependencies: ["project-1"],
          inputSummary: "Campaign objective and market context.",
          expectedOutput: "Execution-ready narrative package.",
          validationNeeded: true,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString()
        },
        {
          id: "task-1",
          missionId: "mission-1",
          parentId: "story-1",
          notionPageId: "page-task-1",
          kind: "task",
          title: "Prepare the first content outline",
          description: "",
          sector: "marketing",
          priority: "high",
          processType: "operational",
          planningStatus: "ready",
          executionStatus: "queued",
          ownerAgentId: "cmo-agent",
          externalUrl: "",
          contextSummary: "Use the approved narrative.",
          acceptanceCriteria: ["Outline covers the weekly angle"],
          dependencies: ["story-1"],
          inputSummary: "Narrative package",
          expectedOutput: "Outline markdown",
          validationNeeded: false,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString()
        }
      ]
    };

    const context = await createRuntimeContext({
      config: createTestConfig(paths),
      planningAdapter: createFakePlanningAdapter(snapshot)
    });

    const result = await context.planningService.syncPlanningTree();
    expect(result.items).toHaveLength(4);
    expect(result.mirrored).toHaveLength(1);

    const fileContents = await readFile(result.mirrored[0], "utf8");
    expect(fileContents).toContain("Draft the weekly campaign narrative");
    expect(fileContents).toContain("Narrative approved by the marketing lead");

    await context.close();
  });
});
