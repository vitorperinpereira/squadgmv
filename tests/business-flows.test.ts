import { describe, expect, it } from "vitest";
import { buildRuntimeApp } from "../apps/runtime/src/app.js";
import { createRuntimeContext } from "../apps/runtime/src/bootstrap.js";
import {
  createFakePlanningAdapter,
  createTempPaths,
  createTestConfig
} from "./test-helpers.js";

describe("business flows", () => {
  it(
    "bootstraps marketing, sales and technology in sequence and exposes sector visibility",
    async () => {
    const paths = await createTempPaths("gmv-business-flows-");
    const context = await createRuntimeContext({
      config: createTestConfig(paths),
      planningAdapter: createFakePlanningAdapter({ items: [] })
    });
    const app = await buildRuntimeApp(context);

    const missionResponse = await app.inject({
      method: "POST",
      url: "/api/missions",
      headers: {
        "x-gmv-role": "operator"
      },
      payload: {
        title: "Run the first demand engine",
        objective:
          "Execute the first end-to-end marketing, sales and technology cycle for GMV."
      }
    });
    const mission = missionResponse.json();

    const marketingResponse = await app.inject({
      method: "POST",
      url: `/api/missions/${mission.id}/flows/marketing/bootstrap`
    });

    expect(marketingResponse.statusCode).toBe(200);
    const marketingBody = marketingResponse.json();
    expect(marketingBody.counts.planningItems).toBeGreaterThan(1);
    expect(
      marketingBody.planningItems.some(
        (item: { title: string }) =>
          item.title === "Create the manifesto and editorial brief"
      )
    ).toBe(true);
    expect(marketingBody.validations).toHaveLength(1);

    const salesResponse = await app.inject({
      method: "POST",
      url: `/api/missions/${mission.id}/flows/sales/bootstrap`
    });

    expect(salesResponse.statusCode).toBe(200);
    const salesBody = salesResponse.json();
    expect(
      salesBody.planningItems.some(
        (item: { title: string }) =>
          item.title === "Qualify leads and move them to scheduling"
      )
    ).toBe(true);
    expect(
      salesBody.handoffs.some(
        (item: { taskType: string }) => item.taskType === "revenue_ops_support"
      )
    ).toBe(true);

    const technologyResponse = await app.inject({
      method: "POST",
      url: `/api/missions/${mission.id}/flows/technology/bootstrap`
    });

    expect(technologyResponse.statusCode).toBe(200);
    const technologyBody = technologyResponse.json();
    expect(
      technologyBody.planningItems.some(
        (item: { title: string }) =>
          item.title === "Build the landing page for the campaign"
      )
    ).toBe(true);
    expect(
      technologyBody.handoffs.some(
        (item: { taskType: string }) => item.taskType === "go_live_recommendation"
      )
    ).toBe(true);

    const sectorBoardResponse = await app.inject({
      method: "GET",
      url: "/api/boards/sectors"
    });

    expect(sectorBoardResponse.statusCode).toBe(200);
    const sectorBoard = sectorBoardResponse.json();
    expect(sectorBoard.sectors.marketing.planningItems).toBeGreaterThan(0);
    expect(sectorBoard.sectors.sales.planningItems).toBeGreaterThan(0);
    expect(sectorBoard.sectors.technology.planningItems).toBeGreaterThan(0);
    expect(sectorBoard.sectors.quality.pendingValidations).toBeGreaterThan(0);

    const workflowsResponse = await app.inject({
      method: "GET",
      url: `/api/workflows?missionId=${mission.id}`
    });

    expect(workflowsResponse.statusCode).toBe(200);
    const workflows = workflowsResponse.json();
    expect(workflows).toHaveLength(3);
    expect(
      workflows.some((item: { jobName: string }) => item.jobName === "flow.bootstrap.marketing")
    ).toBe(true);

    const memoryResponse = await app.inject({
      method: "GET",
      url: `/api/memory?missionId=${mission.id}`
    });

    expect(memoryResponse.statusCode).toBe(200);
    const memoryRecords = memoryResponse.json();
    expect(memoryRecords.length).toBeGreaterThanOrEqual(8);
    expect(
      memoryRecords.some((item: { domain: string }) => item.domain === "offers")
    ).toBe(true);

    const executiveReportResponse = await app.inject({
      method: "GET",
      url: "/api/reports/executive"
    });

    expect(executiveReportResponse.statusCode).toBe(200);
    const report = executiveReportResponse.json();
    expect(report.metrics.memoryRecordsTotal).toBe(memoryRecords.length);
    expect(report.memoryCoverage.technology).toBeGreaterThan(0);
    expect(report.bySector.marketing.planningItems).toBeGreaterThan(0);
    expect(report.byProcessType.operational.planningItems).toBeGreaterThan(0);
    expect(report.highlights).toHaveLength(3);

    const captureMemoryResponse = await app.inject({
      method: "POST",
      url: "/api/memory/capture",
      payload: {
        domain: "operations",
        title: "Manual operator note",
        summary: "Operator stored a reusable note for the mission.",
        body_ref: "memory://manual/operator-note",
        tags: ["sector:operations", "agent:vitor-perin"],
        source_type: "decision",
        linked_mission_id: mission.id
      }
    });

    expect(captureMemoryResponse.statusCode).toBe(201);

    const operatorMemoryResponse = await app.inject({
      method: "GET",
      url: `/api/memory?missionId=${mission.id}&agent=vitor-perin`
    });

    expect(operatorMemoryResponse.statusCode).toBe(200);
    expect(operatorMemoryResponse.json()).toHaveLength(1);

    const missionDetailResponse = await app.inject({
      method: "GET",
      url: `/api/missions/${mission.id}`
    });
    const missionDetail = missionDetailResponse.json();

    expect(missionDetail.mission.status).toBe("in_execution");
    expect(missionDetail.approvals).toHaveLength(3);
    expect(missionDetail.validations).toHaveLength(3);

      await app.close();
    },
    10000
  );

  it("requires marketing before sales and sales before technology", async () => {
    const paths = await createTempPaths("gmv-business-flows-guard-");
    const context = await createRuntimeContext({
      config: createTestConfig(paths),
      planningAdapter: createFakePlanningAdapter({ items: [] })
    });
    const app = await buildRuntimeApp(context);

    const missionResponse = await app.inject({
      method: "POST",
      url: "/api/missions",
      headers: {
        "x-gmv-role": "operator"
      },
      payload: {
        title: "Guard flow order",
        objective: "Ensure the runtime enforces the flow dependencies."
      }
    });
    const mission = missionResponse.json();

    const salesResponse = await app.inject({
      method: "POST",
      url: `/api/missions/${mission.id}/flows/sales/bootstrap`
    });
    expect(salesResponse.statusCode).toBe(400);
    expect(salesResponse.json().message).toContain("Bootstrap marketing first");

    const marketingResponse = await app.inject({
      method: "POST",
      url: `/api/missions/${mission.id}/flows/marketing/bootstrap`
    });
    expect(marketingResponse.statusCode).toBe(200);

    const technologyResponse = await app.inject({
      method: "POST",
      url: `/api/missions/${mission.id}/flows/technology/bootstrap`
    });
    expect(technologyResponse.statusCode).toBe(400);
    expect(technologyResponse.json().message).toContain("Bootstrap sales first");

    await app.close();
  });
});
