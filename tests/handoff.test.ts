import { describe, expect, it } from "vitest";
import { createRuntimeContext } from "../apps/runtime/src/bootstrap.js";
import { planningItemSchema } from "@gmv/contracts";
import { createTempPaths, createTestConfig } from "./test-helpers.js";

describe("handoff lifecycle", () => {
  it("creates and responds to a handoff for an existing task", async () => {
    const paths = await createTempPaths("gmv-handoff-");
    const context = await createRuntimeContext({
      config: createTestConfig(paths)
    });

    await context.repository.upsertPlanningItems([
      planningItemSchema.parse({
        id: "task-runtime-1",
        missionId: "mission-runtime-1",
        notionPageId: "notion-task-runtime-1",
        kind: "task",
        title: "Produce the first outline",
        description: "",
        sector: "marketing",
        priority: "high",
        processType: "operational",
        planningStatus: "ready",
        executionStatus: "queued",
        ownerAgentId: null,
        externalUrl: "",
        contextSummary: "Initial task for the content squad.",
        acceptanceCriteria: ["Outline is ready"],
        dependencies: [],
        inputSummary: "",
        expectedOutput: "Outline markdown",
        validationNeeded: false,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      })
    ]);

    const created = await context.handoffService.createHandoff({
      task_id: "task-runtime-1",
      origin_agent: "openclaw",
      target_agent: "cmo-agent",
      task_type: "content_outline",
      priority: "high",
      context: {
        mission: "mission-runtime-1"
      },
      input: {
        brief: "Build the first weekly outline."
      },
      expected_output: {
        format: "markdown"
      },
      validation_rules: ["must_have_title"]
    });

    expect(created.status).toBe("pending");

    const responded = await context.handoffService.respondToHandoff(created.id, {
      status: "completed",
      result: {
        asset: "outline.md"
      },
      confidence: 0.92,
      notes: "Ready for review.",
      needs_validation: true
    });

    expect(responded.status).toBe("completed");
    expect(responded.needsValidation).toBe(true);

    await context.close();
  });
});
