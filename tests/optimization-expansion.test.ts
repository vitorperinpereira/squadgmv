import { describe, expect, it } from "vitest";
import { buildRuntimeApp } from "../apps/runtime/src/app.js";
import { createRuntimeContext } from "../apps/runtime/src/bootstrap.js";
import { createTempPaths, createTestConfig } from "./test-helpers.js";

describe("optimization and expansion", () => {
  it(
    "creates optimization initiatives and supports phased expansion with onboarding",
    async () => {
      const paths = await createTempPaths("gmv-optimization-expansion-");
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
        title: "Optimize the first demand cycle",
        objective:
          "Create a baseline mission so optimization initiatives can be opened from runtime signals."
      }
    });
    const mission = missionResponse.json();

    await app.inject({
      method: "POST",
      url: `/api/missions/${mission.id}/flows/marketing/bootstrap`
    });

    const missionDetailResponse = await app.inject({
      method: "GET",
      url: `/api/missions/${mission.id}`
    });
    const missionDetail = missionDetailResponse.json();
    const validation = missionDetail.validations[0];
    const planningItem = missionDetail.planningItems.find(
      (item: { id: string }) => item.id === validation.planningItemId
    );

    const initiativeResponse = await app.inject({
      method: "POST",
      url: "/api/optimizations",
      payload: {
        title: "Improve campaign approval throughput",
        sector: "marketing",
        flow_key: "marketing",
        source_type: "validation",
        source_ref: `validation://${validation.id}`,
        hypothesis:
          "If we tighten the campaign approval package, Brand review will reach passed state faster.",
        owner_agent: "cmo-agent",
        linked_mission_id: mission.id,
        linked_planning_item_id: planningItem.id,
        linked_validation_id: validation.id,
        success_criteria: [
          "Brand review completes without major revision",
          "Approval package is accepted in the first pass"
        ],
        test_start: "2026-03-08T09:00:00.000Z",
        test_end: "2026-03-15T09:00:00.000Z"
      }
    });

    expect(initiativeResponse.statusCode).toBe(201);
    const initiative = initiativeResponse.json();
    expect(initiative.status).toBe("proposed");

    const decisionResponse = await app.inject({
      method: "POST",
      url: `/api/optimizations/${initiative.id}/decision`,
      payload: {
        status: "adopted",
        decision: "adopt",
        result_summary: "The improved package reduced ambiguity for Brand and OpenClaw.",
        learnings: [
          "Approval artifacts need objective, channel and CTA in one place",
          "Brand review should receive the creative package with explicit campaign metadata"
        ]
      }
    });

    expect(decisionResponse.statusCode).toBe(200);
    expect(decisionResponse.json().decision).toBe("adopt");

    const optimizationsResponse = await app.inject({
      method: "GET",
      url: `/api/optimizations?missionId=${mission.id}&sector=marketing`
    });

    expect(optimizationsResponse.statusCode).toBe(200);
    expect(optimizationsResponse.json()).toHaveLength(1);

    const seededCapabilitiesResponse = await app.inject({
      method: "GET",
      url: "/api/expansion/capabilities"
    });

    expect(seededCapabilitiesResponse.statusCode).toBe(200);
    expect(seededCapabilitiesResponse.json().length).toBeGreaterThanOrEqual(4);

    const capabilityResponse = await app.inject({
      method: "POST",
      url: "/api/expansion/capabilities",
      payload: {
        sector: "support",
        capability: "Customer support squad",
        phase: "phase_2",
        status: "planned",
        workflow_keys: ["support-intake", "support-resolution"],
        memory_domains: ["operations", "quality"],
        owner_agent: "vitor-perin"
      }
    });

    expect(capabilityResponse.statusCode).toBe(201);
    const capability = capabilityResponse.json();
    expect(capability.sector).toBe("support");

    const onboardingResponse = await app.inject({
      method: "POST",
      url: "/api/onboarding",
      payload: {
        agent_name: "Support Agent",
        agent_slug: "support-agent",
        actor_type: "worker",
        sector: "support",
        target_phase: "phase_2",
        roles: ["support_operator"],
        workflow_keys: ["support-intake", "support-resolution"],
        required_memory_domains: ["operations", "quality"],
        checklist: [
          "Link support playbook",
          "Review escalation path with OpenClaw"
        ],
        linked_capability_id: capability.id
      }
    });

    expect(onboardingResponse.statusCode).toBe(201);
    expect(onboardingResponse.json().status).toBe("planned");

    const onboardingListResponse = await app.inject({
      method: "GET",
      url: "/api/onboarding?sector=support&phase=phase_2"
    });

    expect(onboardingListResponse.statusCode).toBe(200);
    expect(onboardingListResponse.json()).toHaveLength(1);

    const reportResponse = await app.inject({
      method: "GET",
      url: "/api/reports/executive"
    });

    expect(reportResponse.statusCode).toBe(200);
    const report = reportResponse.json();
    expect(report.optimization.total).toBe(1);
    expect(report.optimization.adopted).toBe(1);
    expect(report.expansion.capabilitiesByPhase.phase_2).toBe(1);
    expect(report.expansion.onboardingPlanned).toBe(1);

    const updatedMissionDetailResponse = await app.inject({
      method: "GET",
      url: `/api/missions/${mission.id}`
    });

    expect(updatedMissionDetailResponse.statusCode).toBe(200);
    expect(updatedMissionDetailResponse.json().optimizationInitiatives).toHaveLength(1);

      await app.close();
    },
    10000
  );
});
