import { readFile } from "node:fs/promises";
import { describe, expect, it } from "vitest";
import { buildRuntimeApp } from "../apps/runtime/src/app.js";
import { createRuntimeContext } from "../apps/runtime/src/bootstrap.js";
import type { NotionPlanningSnapshot } from "@gmv/contracts";
import {
  createFakePlanningAdapter,
  createTempPaths,
  createTestConfig
} from "./test-helpers.js";

describe("queue-backed planning reconcile", () => {
  it("enqueues planning sync, records workflow attempts and mirrors ready stories", async () => {
    const paths = await createTempPaths("gmv-queue-runtime-");
    const snapshot: NotionPlanningSnapshot = {
      items: [
        {
          id: "project-runtime-1",
          missionId: "mission-runtime-1",
          notionPageId: "notion-project-runtime-1",
          kind: "project",
          title: "Runtime Queue Validation",
          description: "",
          sector: "operations",
          priority: "high",
          processType: "strategic",
          planningStatus: "backlog",
          executionStatus: "not_started",
          ownerAgentId: "openclaw",
          externalUrl: "https://notion.local/project-runtime-1",
          contextSummary: "Validate queue-backed reconcile.",
          acceptanceCriteria: ["Project exists for reconcile."],
          dependencies: [],
          inputSummary: "",
          expectedOutput: "",
          validationNeeded: false,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString()
        },
        {
          id: "epic-runtime-1",
          missionId: "mission-runtime-1",
          parentId: "project-runtime-1",
          notionPageId: "notion-epic-runtime-1",
          kind: "epic",
          title: "Epic Runtime Queue Validation",
          description: "",
          sector: "marketing",
          priority: "high",
          processType: "operational",
          planningStatus: "refining",
          executionStatus: "not_started",
          ownerAgentId: "cmo-agent",
          externalUrl: "https://notion.local/epic-runtime-1",
          contextSummary: "Refine the queued planning sync.",
          acceptanceCriteria: [],
          dependencies: ["project-runtime-1"],
          inputSummary: "",
          expectedOutput: "",
          validationNeeded: false,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString()
        },
        {
          id: "story-runtime-ready",
          missionId: "mission-runtime-1",
          parentId: "epic-runtime-1",
          notionPageId: "notion-story-runtime-1",
          kind: "story",
          title: "Story Runtime Queue Validation",
          description: "",
          sector: "marketing",
          priority: "high",
          processType: "operational",
          planningStatus: "ready",
          executionStatus: "not_started",
          ownerAgentId: "cmo-agent",
          externalUrl: "https://notion.local/story-runtime-1",
          contextSummary: "Story is ready to be mirrored after queued reconcile.",
          acceptanceCriteria: ["Mirror file is created locally."],
          dependencies: ["epic-runtime-1"],
          inputSummary: "Mission context",
          expectedOutput: "Ready local story",
          validationNeeded: true,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString()
        }
      ]
    };

    const context = await createRuntimeContext({
      config: createTestConfig(paths),
      planningAdapter: createFakePlanningAdapter(snapshot)
    });
    const app = await buildRuntimeApp(context);

    const reconcileResponse = await app.inject({
      method: "POST",
      url: "/api/sync/notion/reconcile"
    });

    expect(reconcileResponse.statusCode).toBe(202);
    expect(reconcileResponse.json().queueName).toBe("planning.sync-from-notion");

    const queueStatsResponse = await app.inject({
      method: "GET",
      url: "/api/queue/stats"
    });

    expect(queueStatsResponse.statusCode).toBe(200);
    expect(
      queueStatsResponse
        .json()
        .queues.some((queue: { name: string }) => queue.name === "planning.sync-from-notion")
    ).toBe(true);

    const mirrorPath = `${paths.storyMirrorDir}\\story-runtime-ready.story.md`;
    const mirroredStory = await readFile(mirrorPath, "utf8");
    expect(mirroredStory).toContain("Story Runtime Queue Validation");

    const workflowRuns = await context.workflowService.listRuns();
    expect(
      workflowRuns.some(
        (run) =>
          run.jobName === "planning.sync-from-notion" &&
          run.status === "queued" &&
          run.queueJobId
      )
    ).toBe(true);
    expect(
      workflowRuns.some(
        (run) =>
          run.jobName === "planning.sync-from-notion" &&
          run.status === "succeeded" &&
          run.queueJobId
      )
    ).toBe(true);

    await app.close();
  });
});
