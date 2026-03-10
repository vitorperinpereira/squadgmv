import { describe, expect, it } from "vitest";
import { buildRuntimeApp } from "../apps/runtime/src/app.js";
import { createRuntimeContext } from "../apps/runtime/src/bootstrap.js";
import { createTempPaths, createTestConfig } from "./test-helpers.js";

describe("task dashboard", () => {
  it("exposes task data with responsible agents and serves the dashboard page", async () => {
    const paths = await createTempPaths("gmv-task-dashboard-");
    const context = await createRuntimeContext({
      config: createTestConfig(paths)
    });
    const app = await buildRuntimeApp(context);

    const missionResponse = await app.inject({
      method: "POST",
      url: "/api/missions",
      headers: {
        "x-gmv-role": "operator"
      },
      payload: {
        title: "Monitor the first operational dashboard",
        objective:
          "Bootstrap the first mission so the dashboard can display task owners and statuses."
      }
    });
    const mission = missionResponse.json();

    await app.inject({
      method: "POST",
      url: `/api/missions/${mission.id}/flows/marketing/bootstrap`
    });

    const tasksResponse = await app.inject({
      method: "GET",
      url: "/api/tasks?sector=marketing"
    });

    expect(tasksResponse.statusCode).toBe(200);
    const taskDashboard = tasksResponse.json();
    expect(taskDashboard.summary.total).toBeGreaterThan(0);
    expect(
      taskDashboard.items.some(
        (item: { ownerAgentName: string; title: string }) =>
          item.ownerAgentName === "Marketing Squad" &&
          item.title === "Draft the weekly social script"
      )
    ).toBe(true);

    const dashboardPageResponse = await app.inject({
      method: "GET",
      url: "/dashboard/tasks"
    });

    expect(dashboardPageResponse.statusCode).toBe(200);
    expect(dashboardPageResponse.headers["content-type"]).toContain("text/html");
    expect(dashboardPageResponse.body).toContain("Task Control Room");
    expect(dashboardPageResponse.body).toContain("/api/tasks");

    await app.close();
  });
});
