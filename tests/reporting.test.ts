import { afterEach, describe, expect, it, vi } from "vitest";
import { buildRuntimeApp } from "../apps/runtime/src/app.js";
import { createRuntimeContext } from "../apps/runtime/src/bootstrap.js";
import { startExecutiveReportScheduler } from "../apps/runtime/src/report-scheduler.js";
import {
  createFakePlanningAdapter,
  createTempPaths,
  createTestConfig
} from "./test-helpers.js";

afterEach(() => {
  vi.useRealTimers();
});

describe("executive reporting", () => {
  it("links KPI payloads to missions, planning items and Notion URLs while storing report history", async () => {
    const paths = await createTempPaths("gmv-reporting-links-");
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
        title: "Generate executive visibility",
        objective:
          "Bootstrap the first flow so the executive report can expose explicit operational references."
      }
    });
    const mission = missionResponse.json();

    await app.inject({
      method: "POST",
      url: `/api/missions/${mission.id}/flows/marketing/bootstrap`
    });

    const detail = await context.missionService.getMission(mission.id);
    const firstTask = detail.planningItems.find(
      (item) => item.kind === "task"
    );

    expect(firstTask).toBeDefined();

    await context.repository.updateMission(mission.id, {
      notionProjectPageId: "notion-project-live",
      notionProjectUrl: "https://www.notion.so/gmv/project-live",
      updatedAt: new Date().toISOString()
    });
    await context.repository.upsertPlanningItems([
      {
        ...firstTask!,
        notionPageId: "notion-task-live",
        externalUrl: "https://www.notion.so/gmv/task-live",
        updatedAt: new Date().toISOString()
      }
    ]);

    const reportResponse = await app.inject({
      method: "GET",
      url: "/api/reports/executive"
    });

    expect(reportResponse.statusCode).toBe(200);
    const report = reportResponse.json();
    expect(
      report.metricLinks.missions.some(
        (reference: { externalUrl: string | null }) =>
          reference.externalUrl === "https://www.notion.so/gmv/project-live"
      )
    ).toBe(true);
    expect(
      report.metricLinks.planningItems.some(
        (reference: { notionPageId: string | null }) =>
          reference.notionPageId === "notion-task-live"
      )
    ).toBe(true);
    expect(
      report.bySector.marketing.links.some(
        (reference: { externalUrl: string | null }) =>
          reference.externalUrl === "https://www.notion.so/gmv/task-live"
      )
    ).toBe(true);

    const generateResponse = await app.inject({
      method: "POST",
      url: "/api/reports/executive/generate",
      payload: {
        reason: "Manual reporting snapshot for the chief of staff."
      }
    });

    expect(generateResponse.statusCode).toBe(202);

    const historyResponse = await app.inject({
      method: "GET",
      url: "/api/reports/executive/history?limit=5"
    });

    expect(historyResponse.statusCode).toBe(200);
    const history = historyResponse.json();
    expect(history).toHaveLength(1);
    expect(history[0].trigger).toBe("manual");
    expect(
      history[0].report.metricLinks.planningItems.some(
        (reference: { notionPageId: string | null }) =>
          reference.notionPageId === "notion-task-live"
      )
    ).toBe(true);

    await app.close();
  });

  it("enqueues recurring executive reports when an interval is configured", async () => {
    const paths = await createTempPaths("gmv-reporting-scheduler-");
    const config = createTestConfig(paths);
    config.EXECUTIVE_REPORT_INTERVAL_MINUTES = 0.001;
    const context = await createRuntimeContext({
      config,
      planningAdapter: createFakePlanningAdapter({ items: [] })
    });

    const mission = await context.missionService.createMission(
      context.parseMissionInput({
        title: "Scheduled reporting mission",
        objective:
          "Create a mission so the recurring scheduler can generate report snapshots with live runtime data."
      })
    );

    await context.businessFlowService.bootstrapFlow(mission.id, "marketing");

    const scheduler = startExecutiveReportScheduler(context);

    await new Promise((resolve) => {
      setTimeout(resolve, 150);
    });

    scheduler.stop();

    const history = await context.reportingService.listExecutiveReportSnapshots();
    expect(history.length).toBeGreaterThanOrEqual(1);
    expect(history[0].trigger).toBe("scheduled");

    await context.close();
  });
});
