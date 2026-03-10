import { createRuntimeContext } from "../apps/runtime/src/bootstrap.js";
import { businessFlowKeySchema, type BusinessFlowKey } from "@gmv/contracts";

const [command, ...args] = process.argv.slice(2);
const context = await createRuntimeContext();

try {
  if (command === "status") {
    const [executive, sectors] = await Promise.all([
      context.boardService.getExecutiveBoard(),
      context.boardService.getSectorBoard()
    ]);
    console.log(
      JSON.stringify(
        {
          executive,
          sectors
        },
        null,
        2
      )
    );
  } else if (command === "agents:list") {
    console.log(
      JSON.stringify(
        await context.agentDirectoryService.listAgents({
          sector: readArgument(args, "--sector"),
          phase: readArgument(args, "--phase") as
            | "mvp"
            | "phase_2"
            | "phase_3"
            | undefined,
          status: readArgument(args, "--status") as
            | "active"
            | "paused"
            | "disabled"
            | undefined,
          actorType: readArgument(args, "--actor-type") as
            | "founder"
            | "ceo"
            | "c_level"
            | "specialist"
            | "worker"
            | "human_operator"
            | "system"
            | undefined
        }),
        null,
        2
      )
    );
  } else if (command === "tasks:list") {
    console.log(
      JSON.stringify(
        await context.taskBoardService.getTaskDashboard({
          missionId: readArgument(args, "--mission-id"),
          sector: readArgument(args, "--sector"),
          planningStatus: readArgument(args, "--planning-status") as
            | "backlog"
            | "refining"
            | "ready"
            | "in_progress"
            | "waiting_validation"
            | "done"
            | "cancelled"
            | undefined,
          executionStatus: readArgument(args, "--execution-status") as
            | "not_started"
            | "queued"
            | "running"
            | "blocked"
            | "completed"
            | "failed"
            | undefined,
          owner: readArgument(args, "--owner")
        }),
        null,
        2
      )
    );
  } else if (command === "gates:list") {
    console.log(
      JSON.stringify(
        await context.governancePolicyService.listGatePolicies({
          flowKey: readArgument(args, "--flow") as
            | "marketing"
            | "sales"
            | "technology"
            | undefined,
          stage: readArgument(args, "--stage") as
            | "validation"
            | "approval"
            | undefined,
          active:
            readArgument(args, "--active") === undefined
              ? undefined
              : readArgument(args, "--active") === "true"
        }),
        null,
        2
      )
    );
  } else if (command === "gate:create") {
    const policy = await context.governancePolicyService.createGatePolicy(
      context.parseGovernanceGatePolicyCreateInput({
        key: readArgument(args, "--key") ?? "custom-governance-gate",
        flow_key: readArgument(args, "--flow") ?? "marketing",
        stage: readArgument(args, "--stage") ?? "validation",
        scope: readArgument(args, "--scope") ?? "task",
        task_slug: readArgument(args, "--task-slug") ?? undefined,
        sector: readArgument(args, "--sector") ?? "operations",
        active:
          readArgument(args, "--active") === undefined
            ? true
            : readArgument(args, "--active") === "true",
        validator_slug: readArgument(args, "--validator") ?? undefined,
        validation_type: readArgument(args, "--validation-type") ?? undefined,
        initial_validation_status:
          readArgument(args, "--initial-status") ?? undefined,
        findings_template: readCsvArgument(args, "--findings-template") ?? [],
        requested_by_slug: readArgument(args, "--requested-by") ?? undefined,
        approver_slug: readArgument(args, "--approver") ?? undefined,
        approval_type: readArgument(args, "--approval-type") ?? undefined,
        decision_notes_template: readArgument(args, "--decision-notes") ?? ""
      })
    );
    console.log(JSON.stringify(policy, null, 2));
  } else if (command === "mission:create") {
    const title = readArgument(args, "--title") ?? "Untitled Mission";
    const objective =
      readArgument(args, "--objective") ??
      "Objective not provided. Update this mission before execution.";
    const mission = await context.missionService.createMission(
      context.parseMissionInput({
        title,
        objective
      })
    );
    console.log(JSON.stringify(mission, null, 2));
  } else if (command === "flow:bootstrap") {
    const missionId = readArgument(args, "--mission-id");

    if (!missionId) {
      throw new Error('Missing "--mission-id" for flow bootstrap.');
    }

    const flowArgument = readArgument(args, "--flow") ?? "marketing";
    const flows: BusinessFlowKey[] =
      flowArgument === "all"
        ? ["marketing", "sales", "technology"]
        : [businessFlowKeySchema.parse(flowArgument)];
    const results = [];

    for (const flow of flows) {
      results.push(await context.businessFlowService.bootstrapFlow(missionId, flow));
    }

    console.log(JSON.stringify(results, null, 2));
  } else if (command === "sync") {
    const result = await context.planningService.enqueuePlanningSync();
    console.log(JSON.stringify(result, null, 2));
  } else if (command === "sync:governance") {
    const result = await context.planningService.syncGovernanceState({
      missionId: readArgument(args, "--mission-id"),
      planningItemId: readArgument(args, "--planning-item-id")
    });
    console.log(JSON.stringify(result, null, 2));
  } else if (command === "queue:stats") {
    console.log(JSON.stringify(await context.queue.getStats(), null, 2));
  } else if (command === "queue:failed") {
    console.log(
      JSON.stringify(
        await context.queue.listFailed(readArgument(args, "--job-name")),
        null,
        2
      )
    );
  } else if (command === "queue:retry") {
    const jobName = readArgument(args, "--job-name");
    const jobId = readArgument(args, "--job-id");

    if (!jobName || !jobId) {
      throw new Error('Missing "--job-name" or "--job-id" for queue retry.');
    }

    console.log(
      JSON.stringify(await context.queue.retry(jobName, jobId), null, 2)
    );
  } else if (command === "escalations:list") {
    console.log(
      JSON.stringify(
        await context.escalationService.listEscalations({
          handoffId: readArgument(args, "--handoff-id"),
          status: readArgument(args, "--status") as "open" | "resolved" | undefined
        }),
        null,
        2
      )
    );
  } else if (command === "handoff:escalate") {
    const handoffId = readArgument(args, "--handoff-id");

    if (!handoffId) {
      throw new Error('Missing "--handoff-id" for handoff escalation.');
    }

    const result = await context.escalationService.escalateHandoff(
      handoffId,
      context.parseHandoffEscalationInput({
        reason:
          readArgument(args, "--reason") ??
          "Escalation requested from the CLI operator.",
        note: readArgument(args, "--note") ?? "",
        force_target: readArgument(args, "--force-target") ?? undefined
      })
    );
    console.log(JSON.stringify(result, null, 2));
  } else if (command === "validation:create") {
    const validation = await context.validationService.recordValidation(
      context.parseValidationResultInput({
        planning_item_id: readArgument(args, "--planning-item-id"),
        validator_agent: readArgument(args, "--validator") ?? "chief-quality-agent",
        validation_type: readArgument(args, "--validation-type") ?? "quality",
        status: readArgument(args, "--status") ?? "warning",
        findings: readCsvArgument(args, "--findings") ?? []
      })
    );
    const governanceSync = await context.planningService.syncGovernanceState({
      planningItemId: validation.planningItemId
    });
    console.log(JSON.stringify({ validation, governanceSync }, null, 2));
  } else if (command === "approval:create") {
    const approval = await context.approvalService.requestApproval(
      context.parseApprovalCreateInput({
        planning_item_id: readArgument(args, "--planning-item-id"),
        requested_by_agent: readArgument(args, "--requested-by") ?? "openclaw",
        approver_agent: readArgument(args, "--approver") ?? "vitor-perin",
        approval_type: readArgument(args, "--approval-type") ?? "quality_gate"
      })
    );
    const governanceSync = await context.planningService.syncGovernanceState({
      planningItemId: approval.planningItemId
    });
    console.log(JSON.stringify({ approval, governanceSync }, null, 2));
  } else if (command === "approval:decision") {
    const approvalId = readArgument(args, "--approval-id");

    if (!approvalId) {
      throw new Error('Missing "--approval-id" for approval decision.');
    }

    const approval = await context.approvalService.decideApproval(
      approvalId,
      context.parseApprovalDecisionInput({
        status: readArgument(args, "--status") ?? "approved",
        decision_notes: readArgument(args, "--decision-notes") ?? ""
      })
    );
    const governanceSync = await context.planningService.syncGovernanceState({
      planningItemId: approval.planningItemId
    });
    console.log(JSON.stringify({ approval, governanceSync }, null, 2));
  } else if (command === "workflows:list") {
    const missionId = readArgument(args, "--mission-id");
    console.log(
      JSON.stringify(
        await context.workflowService.listRuns({
          missionId
        }),
        null,
        2
      )
    );
  } else if (command === "memory:list") {
    const domain = readArgument(args, "--domain") as
      | "brand"
      | "offers"
      | "sales"
      | "technology"
      | "operations"
      | "quality"
      | undefined;
    const missionId = readArgument(args, "--mission-id");
    const tag =
      readArgument(args, "--tag") ??
      (readArgument(args, "--sector")
        ? `sector:${readArgument(args, "--sector")}`
        : undefined) ??
      (readArgument(args, "--agent")
        ? `agent:${readArgument(args, "--agent")}`
        : undefined);
    console.log(
      JSON.stringify(
        await context.memoryService.searchMemory({
          domain,
          missionId,
          tag
        }),
        null,
        2
      )
    );
  } else if (command === "report:executive") {
    console.log(
      JSON.stringify(await context.reportingService.getExecutiveReport(), null, 2)
    );
  } else if (command === "report:generate") {
    console.log(
      JSON.stringify(
        await context.reportingService.generateExecutiveReportSnapshot({
          trigger: "manual",
          reason:
            readArgument(args, "--reason") ??
            "Manual executive report generation requested via CLI."
        }),
        null,
        2
      )
    );
  } else if (command === "report:history") {
    const limitValue = readArgument(args, "--limit");
    const limit = limitValue ? Number(limitValue) : undefined;
    console.log(
      JSON.stringify(
        await context.reportingService.listExecutiveReportSnapshots(limit),
        null,
        2
      )
    );
  } else if (command === "optimizations:list") {
    console.log(
      JSON.stringify(
        await context.optimizationService.listInitiatives({
          missionId: readArgument(args, "--mission-id"),
          sector: readArgument(args, "--sector"),
          flowKey: readArgument(args, "--flow"),
          status: readArgument(args, "--status") as
            | "proposed"
            | "active"
            | "reviewing"
            | "adopted"
            | "reverted"
            | "iterating"
            | undefined
        }),
        null,
        2
      )
    );
  } else if (command === "optimization:create") {
    const initiative = await context.optimizationService.createInitiative(
      context.parseOptimizationCreateInput({
        title: readArgument(args, "--title") ?? "Untitled Optimization",
        sector: readArgument(args, "--sector") ?? "operations",
        flow_key: readArgument(args, "--flow") ?? undefined,
        source_type: readArgument(args, "--source-type") ?? "report",
        source_ref: readArgument(args, "--source-ref") ?? "manual://cli",
        hypothesis:
          readArgument(args, "--hypothesis") ??
          "Hypothesis not provided. Update before execution.",
        owner_agent: readArgument(args, "--owner") ?? "vitor-perin",
        linked_mission_id: readArgument(args, "--mission-id") ?? undefined,
        linked_planning_item_id: readArgument(args, "--planning-item-id") ?? undefined,
        linked_validation_id: readArgument(args, "--validation-id") ?? undefined,
        success_criteria: readCsvArgument(args, "--success-criteria") ?? [
          "Define success criteria before execution"
        ],
        test_start: readArgument(args, "--test-start") ?? new Date().toISOString(),
        test_end: readArgument(args, "--test-end") ?? new Date().toISOString()
      })
    );
    console.log(JSON.stringify(initiative, null, 2));
  } else if (command === "capabilities:list") {
    console.log(
      JSON.stringify(
        await context.expansionService.listCapabilities({
          sector: readArgument(args, "--sector"),
          phase: readArgument(args, "--phase") as
            | "mvp"
            | "phase_2"
            | "phase_3"
            | undefined
        }),
        null,
        2
      )
    );
  } else if (command === "capability:create") {
    const capability = await context.expansionService.createCapability(
      context.parseSectorCapabilityCreateInput({
        sector: readArgument(args, "--sector") ?? "support",
        capability: readArgument(args, "--capability") ?? "New capability",
        phase: readArgument(args, "--phase") ?? "phase_2",
        status: readArgument(args, "--status") ?? "planned",
        workflow_keys: readCsvArgument(args, "--workflow-keys") ?? [],
        memory_domains: readCsvArgument(args, "--memory-domains") ?? [],
        owner_agent: readArgument(args, "--owner") ?? undefined
      })
    );
    console.log(JSON.stringify(capability, null, 2));
  } else if (command === "onboarding:list") {
    console.log(
      JSON.stringify(
        await context.expansionService.listOnboarding({
          sector: readArgument(args, "--sector"),
          phase: readArgument(args, "--phase") as
            | "mvp"
            | "phase_2"
            | "phase_3"
            | undefined,
          status: readArgument(args, "--status") as
            | "planned"
            | "ready"
            | "completed"
            | undefined
        }),
        null,
        2
      )
    );
  } else if (command === "onboarding:create") {
    const onboarding = await context.expansionService.onboardAgent(
      context.parseAgentOnboardingCreateInput({
        agent_name: readArgument(args, "--agent-name") ?? "New Agent",
        agent_slug: readArgument(args, "--agent-slug") ?? "new-agent",
        actor_type: readArgument(args, "--actor-type") ?? "worker",
        sector: readArgument(args, "--sector") ?? "support",
        target_phase: readArgument(args, "--phase") ?? "phase_2",
        roles: readCsvArgument(args, "--roles") ?? ["squad_executor"],
        workflow_keys: readCsvArgument(args, "--workflow-keys") ?? [],
        required_memory_domains: readCsvArgument(args, "--memory-domains") ?? [],
        checklist: readCsvArgument(args, "--checklist") ?? [],
        linked_capability_id: readArgument(args, "--capability-id") ?? undefined
      })
    );
    console.log(JSON.stringify(onboarding, null, 2));
  } else {
    console.log("Usage:");
    console.log("  tsx bin/gmv.ts status");
    console.log('  tsx bin/gmv.ts agents:list [--sector "marketing"] [--phase "mvp"]');
    console.log('  tsx bin/gmv.ts tasks:list [--sector "marketing"] [--execution-status "running"] [--owner "cmo-agent"]');
    console.log('  tsx bin/gmv.ts gates:list [--flow "marketing"] [--stage "validation"] [--active "true"]');
    console.log('  tsx bin/gmv.ts gate:create --key "..." --flow "marketing" --stage validation|approval --scope task|project --sector "brand"');
    console.log(
      '  tsx bin/gmv.ts mission:create --title "..." --objective "..."'
    );
    console.log(
      '  tsx bin/gmv.ts flow:bootstrap --mission-id "..." --flow marketing|sales|technology|all'
    );
    console.log("  tsx bin/gmv.ts sync");
    console.log('  tsx bin/gmv.ts sync:governance [--mission-id "..."] [--planning-item-id "..."]');
    console.log("  tsx bin/gmv.ts queue:stats");
    console.log('  tsx bin/gmv.ts queue:failed [--job-name "planning.sync-from-notion"]');
    console.log('  tsx bin/gmv.ts queue:retry --job-name "planning.sync-from-notion" --job-id "..."');
    console.log('  tsx bin/gmv.ts escalations:list [--handoff-id "..."] [--status "open"]');
    console.log('  tsx bin/gmv.ts handoff:escalate --handoff-id "..." --reason "..." [--force-target "openclaw"]');
    console.log('  tsx bin/gmv.ts validation:create --planning-item-id "..." --validator "chief-quality-agent" --validation-type "quality" --status warning|passed|failed');
    console.log('  tsx bin/gmv.ts approval:create --planning-item-id "..." --requested-by "openclaw" --approver "vitor-perin" --approval-type "quality_gate"');
    console.log('  tsx bin/gmv.ts approval:decision --approval-id "..." --status approved|rejected --decision-notes "..."');
    console.log('  tsx bin/gmv.ts workflows:list [--mission-id "..."]');
    console.log('  tsx bin/gmv.ts memory:list [--domain "sales"] [--mission-id "..."] [--tag "flow:marketing"] [--sector "marketing"] [--agent "vitor-perin"]');
    console.log("  tsx bin/gmv.ts report:executive");
    console.log('  tsx bin/gmv.ts report:generate [--reason "..."]');
    console.log('  tsx bin/gmv.ts report:history [--limit "10"]');
    console.log('  tsx bin/gmv.ts optimizations:list [--mission-id "..."] [--sector "marketing"] [--flow "marketing"]');
    console.log('  tsx bin/gmv.ts optimization:create --title "..." --hypothesis "..." --owner "cmo-agent" --source-ref "validation://..."');
    console.log('  tsx bin/gmv.ts capabilities:list [--sector "support"] [--phase "phase_2"]');
    console.log('  tsx bin/gmv.ts capability:create --sector "support" --capability "Customer support squad" --phase "phase_2"');
    console.log('  tsx bin/gmv.ts onboarding:list [--sector "support"]');
    console.log('  tsx bin/gmv.ts onboarding:create --agent-name "Support Agent" --agent-slug "support-agent" --sector "support"');
  }
} finally {
  await context.close();
}

function readArgument(args: string[], name: string): string | undefined {
  const index = args.indexOf(name);

  if (index === -1) {
    return undefined;
  }

  return args[index + 1];
}

function readCsvArgument(args: string[], name: string): string[] | undefined {
  const value = readArgument(args, name);

  if (!value) {
    return undefined;
  }

  return value
    .split(",")
    .map((item) => item.trim())
    .filter(Boolean);
}
