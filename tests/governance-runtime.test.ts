import { describe, expect, it } from "vitest";
import { buildRuntimeApp } from "../apps/runtime/src/app.js";
import { createRuntimeContext } from "../apps/runtime/src/bootstrap.js";
import { createTempPaths, createTestConfig } from "./test-helpers.js";

describe("governance runtime", () => {
  it(
    "applies seeded and custom governance gates when bootstrapping a flow",
    async () => {
      const paths = await createTempPaths("gmv-governance-gates-");
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
        title: "Govern marketing delivery with configurable gates",
        objective:
          "Create a mission so marketing can pick up both seeded and custom governance policies."
      }
    });
    const mission = missionResponse.json();

    const gateResponse = await app.inject({
      method: "POST",
      url: "/api/governance/gates",
      payload: {
        key: "marketing-creative-asset-review",
        flow_key: "marketing",
        stage: "validation",
        scope: "task",
        task_slug: "creative-package",
        sector: "brand",
        validator_slug: "brand-guardian",
        validation_type: "brand_asset",
        initial_validation_status: "warning",
        findings_template: [
          "Creative package must include campaign metadata before release."
        ]
      }
    });

    expect(gateResponse.statusCode).toBe(201);

    const marketingResponse = await app.inject({
      method: "POST",
      url: `/api/missions/${mission.id}/flows/marketing/bootstrap`
    });

    expect(marketingResponse.statusCode).toBe(200);
    const marketing = marketingResponse.json();
    expect(marketing.validations).toHaveLength(2);
    expect(
      marketing.validations.some(
        (validation: { validationType: string; planningItemId: string }) =>
          validation.validationType === "brand_asset" &&
          validation.planningItemId ===
            `${mission.id}--marketing--task--creative-package`
      )
    ).toBe(true);

    const gatesListResponse = await app.inject({
      method: "GET",
      url: "/api/governance/gates?flowKey=marketing&stage=validation&active=true"
    });

    expect(gatesListResponse.statusCode).toBe(200);
    expect(gatesListResponse.json()).toHaveLength(2);

      await app.close();
    },
    10000
  );

  it("blocks routing when the target agent is paused", async () => {
    const paths = await createTempPaths("gmv-governance-route-");
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
        title: "Protect handoffs from inactive agents",
        objective:
          "Create a mission so routing blocks any handoff that points to a paused or disabled agent."
      }
    });
    const mission = missionResponse.json();

    await app.inject({
      method: "POST",
      url: `/api/missions/${mission.id}/flows/marketing/bootstrap`
    });

    const marketingSquad = await context.repository.getAgentBySlug("marketing-squad");
    expect(marketingSquad).toBeDefined();

    await context.repository.upsertAgent({
      ...marketingSquad!,
      status: "paused"
    });

    const handoffResponse = await app.inject({
      method: "POST",
      url: "/api/handoffs",
      payload: {
        task_id: `${mission.id}--marketing--task--campaign-calendar`,
        origin_agent: "cmo-agent",
        target_agent: "marketing-squad",
        task_type: "content_production",
        priority: "high",
        context: {
          flow: "marketing",
          sector: "marketing"
        },
        input: {
          artifact: "editorial-calendar"
        },
        expected_output: "Production package",
        validation_rules: ["must_have_campaign_link"]
      }
    });

    expect(handoffResponse.statusCode).toBe(400);
    expect(handoffResponse.json().message).toContain("Target agent is not active");

    await app.close();
  });

  it("escalates a handoff through c-level, ceo and founder with explicit records", async () => {
    const paths = await createTempPaths("gmv-governance-escalation-");
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
        title: "Escalate blocked delivery across the chain",
        objective:
          "Create a mission so a blocked delivery can move from squad to c-level, ceo and founder."
      }
    });
    const mission = missionResponse.json();

    await app.inject({
      method: "POST",
      url: `/api/missions/${mission.id}/flows/marketing/bootstrap`
    });

    const handoffResponse = await app.inject({
      method: "POST",
      url: "/api/handoffs",
      payload: {
        task_id: `${mission.id}--marketing--task--campaign-calendar`,
        origin_agent: "openclaw",
        target_agent: "marketing-squad",
        task_type: "delivery_blocker",
        priority: "critical",
        context: {
          flow: "marketing",
          sector: "marketing"
        },
        input: {
          blocker: "Campaign cannot proceed without leadership support."
        },
        expected_output: "Decision and unblock plan",
        validation_rules: ["must_define_next_owner"]
      }
    });

    expect(handoffResponse.statusCode).toBe(201);
    const seededHandoff = handoffResponse.json();

    const escalationToCLevel = await app.inject({
      method: "POST",
      url: `/api/handoffs/${seededHandoff.id}/escalate`,
      payload: {
        reason: "Squad needs leadership decision.",
        note: "Escalating to marketing leadership."
      }
    });

    expect(escalationToCLevel.statusCode).toBe(200);
    expect(escalationToCLevel.json().record.level).toBe("to_c_level");

    const escalationToCeo = await app.inject({
      method: "POST",
      url: `/api/handoffs/${escalationToCLevel.json().handoff.id}/escalate`,
      payload: {
        reason: "C-level could not clear the blocker.",
        note: "Escalating to OpenClaw."
      }
    });

    expect(escalationToCeo.statusCode).toBe(200);
    expect(escalationToCeo.json().record.level).toBe("to_ceo");

    const escalationToFounder = await app.inject({
      method: "POST",
      url: `/api/handoffs/${escalationToCeo.json().handoff.id}/escalate`,
      payload: {
        reason: "CEO requests founder intervention.",
        note: "Escalating to Vitor."
      }
    });

    expect(escalationToFounder.statusCode).toBe(200);
    expect(escalationToFounder.json().record.level).toBe("to_founder");

    const escalationsResponse = await app.inject({
      method: "GET",
      url: "/api/escalations?status=open"
    });

    expect(escalationsResponse.statusCode).toBe(200);
    const escalations = escalationsResponse.json();
    expect(escalations).toHaveLength(3);
    expect(
      escalations.map((record: { level: string }) => record.level)
    ).toEqual(["to_c_level", "to_ceo", "to_founder"]);

    await app.close();
  });
});
