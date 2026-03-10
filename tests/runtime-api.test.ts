import { describe, expect, it } from "vitest";
import { buildRuntimeApp } from "../apps/runtime/src/app.js";
import { createRuntimeContext } from "../apps/runtime/src/bootstrap.js";
import { createTempPaths, createTestConfig } from "./test-helpers.js";

describe("runtime api", () => {
  it("creates missions and exposes health plus executive board", async () => {
    const paths = await createTempPaths("gmv-runtime-api-");
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
        title: "Launch marketing baseline",
        objective:
          "Create the first operational mission so the GMV runtime can start tracking work."
      }
    });

    expect(missionResponse.statusCode).toBe(201);
    const missionBody = missionResponse.json();
    expect(missionBody.title).toBe("Launch marketing baseline");
    expect(missionBody.status).toBe("accepted");

    const healthResponse = await app.inject({
      method: "GET",
      url: "/health"
    });

    expect(healthResponse.statusCode).toBe(200);
    expect(healthResponse.json().ok).toBe(true);

    const boardResponse = await app.inject({
      method: "GET",
      url: "/api/boards/executive"
    });

    expect(boardResponse.statusCode).toBe(200);
    expect(boardResponse.json().missions.total).toBe(1);

    const agentsResponse = await app.inject({
      method: "GET",
      url: "/api/agents?sector=marketing"
    });

    expect(agentsResponse.statusCode).toBe(200);
    expect(
      agentsResponse
        .json()
        .some((agent: { slug: string }) => agent.slug === "cmo-agent")
    ).toBe(true);

    await app.close();
  });
});
