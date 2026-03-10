import Fastify from "fastify";
import { businessFlowKeySchema } from "@gmv/contracts";
import {
  canCreateMission,
  canDecideApproval,
  resolveRoleFromHeaders
} from "@gmv/auth";
import { createRuntimeContext, type RuntimeContext } from "./bootstrap.js";
import { renderTaskDashboardPage } from "./task-dashboard-page.js";

export async function buildRuntimeApp(
  contextOverride?: RuntimeContext
) {
  const context = contextOverride ?? (await createRuntimeContext());
  const app = Fastify({
    loggerInstance: context.logger
  });

  app.get("/health", async () => ({
    ok: true,
    mode: context.config.NODE_ENV,
    queueDriver: context.queue.driverName,
    notion: context.planningAdapter.getStatus(),
    reporting: {
      recurringIntervalMinutes: context.config.EXECUTIVE_REPORT_INTERVAL_MINUTES
    },
    storage: {
      driver: context.config.STATE_DRIVER,
      liveDatabaseConfigured: context.config.liveDatabaseConfigured,
      stateFile: context.config.GMV_STATE_FILE
    }
  }));

  app.post("/api/missions", async (request, reply) => {
    const role = resolveRoleFromHeaders(request.headers);

    if (!canCreateMission(role)) {
      return reply.code(403).send({
        message: "Current role cannot create missions."
      });
    }

    const input = context.parseMissionInput(request.body);
    const mission = await context.missionService.createMission(input);
    return reply.code(201).send(mission);
  });

  app.get("/api/missions/:missionId", async (request, reply) => {
    const params = request.params as { missionId: string };
    const detail = await context.missionService.getMission(params.missionId);

    if (!detail.mission) {
      return reply.code(404).send({ message: "Mission not found." });
    }

    return detail;
  });

  app.get("/api/agents", async (request) => {
    const query = request.query as {
      sector?: string;
      phase?: "mvp" | "phase_2" | "phase_3";
      status?: "active" | "paused" | "disabled";
      actorType?:
        | "founder"
        | "ceo"
        | "c_level"
        | "specialist"
        | "worker"
        | "human_operator"
        | "system";
    };

    return context.agentDirectoryService.listAgents({
      sector: query.sector,
      phase: query.phase,
      status: query.status,
      actorType: query.actorType
    });
  });

  app.get("/api/tasks", async (request) => {
    const query = request.query as {
      missionId?: string;
      sector?: string;
      planningStatus?:
        | "backlog"
        | "refining"
        | "ready"
        | "in_progress"
        | "waiting_validation"
        | "done"
        | "cancelled";
      executionStatus?:
        | "not_started"
        | "queued"
        | "running"
        | "blocked"
        | "completed"
        | "failed";
      owner?: string;
    };

    return context.taskBoardService.getTaskDashboard({
      missionId: query.missionId,
      sector: query.sector,
      planningStatus: query.planningStatus,
      executionStatus: query.executionStatus,
      owner: query.owner
    });
  });

  app.get("/dashboard/tasks", async (_request, reply) => {
    return reply.type("text/html; charset=utf-8").send(renderTaskDashboardPage());
  });

  app.post("/api/planning-items/:id/refresh", async (request, reply) => {
    const params = request.params as { id: string };
    const syncResult = await context.planningService.syncPlanningTree();
    const item = syncResult.items.find(
      (candidate: { id: string }) => candidate.id === params.id
    );

    if (!item) {
      return reply.code(404).send({ message: "Planning item not found after sync." });
    }

    return {
      item,
      mirrored: syncResult.mirrored,
      skipped: syncResult.skipped
    };
  });

  app.post("/api/sync/notion/reconcile", async (_request, reply) => {
    const queued = await context.planningService.enqueuePlanningSync();
    return reply.code(202).send(queued);
  });

  app.get("/api/queue/stats", async () => {
    return context.queue.getStats();
  });

  app.get("/api/queue/failed", async (request) => {
    const query = request.query as { jobName?: string };
    return context.queue.listFailed(query.jobName);
  });

  app.post("/api/queue/retry", async (request) => {
    const body = request.body as {
      jobName: string;
      jobId: string | string[];
    };

    return context.queue.retry(body.jobName, body.jobId);
  });

  app.post("/api/sync/notion/governance", async (request) => {
    const body = (request.body ?? {}) as {
      missionId?: string;
      planningItemId?: string;
    };

    return context.planningService.syncGovernanceState({
      missionId: body.missionId,
      planningItemId: body.planningItemId
    });
  });

  app.post("/api/missions/:missionId/flows/:flow/bootstrap", async (request) => {
    const params = request.params as { missionId: string; flow: string };
    const flow = businessFlowKeySchema.parse(params.flow);
    const result = await context.businessFlowService.bootstrapFlow(
      params.missionId,
      flow
    );
    const governanceSync = await context.planningService.syncGovernanceState({
      missionId: params.missionId
    });

    return {
      ...result,
      governanceSync
    };
  });

  app.get("/api/workflows", async (request) => {
    const query = request.query as {
      missionId?: string;
      status?: "queued" | "running" | "succeeded" | "failed" | "compensating" | "cancelled";
    };

    return context.workflowService.listRuns({
      missionId: query.missionId,
      status: query.status
    });
  });

  app.get("/api/memory", async (request) => {
    const query = request.query as {
      domain?: "brand" | "offers" | "sales" | "technology" | "operations" | "quality";
      missionId?: string;
      tag?: string;
      sector?: string;
      agent?: string;
      q?: string;
    };

    return context.memoryService.searchMemory({
      domain: query.domain,
      missionId: query.missionId,
      tag:
        query.tag ??
        (query.sector ? `sector:${query.sector}` : undefined) ??
        (query.agent ? `agent:${query.agent}` : undefined),
      query: query.q
    });
  });

  app.post("/api/memory/capture", async (request, reply) => {
    const input = context.parseMemoryCaptureInput(request.body);
    const record = await context.memoryService.captureDecision(input);
    return reply.code(201).send(record);
  });

  app.get("/api/optimizations", async (request) => {
    const query = request.query as {
      missionId?: string;
      sector?: string;
      flowKey?: string;
      status?:
        | "proposed"
        | "active"
        | "reviewing"
        | "adopted"
        | "reverted"
        | "iterating";
    };

    return context.optimizationService.listInitiatives({
      missionId: query.missionId,
      sector: query.sector,
      flowKey: query.flowKey,
      status: query.status
    });
  });

  app.post("/api/optimizations", async (request, reply) => {
    const input = context.parseOptimizationCreateInput(request.body);
    const initiative = await context.optimizationService.createInitiative(input);
    return reply.code(201).send(initiative);
  });

  app.post("/api/optimizations/:id/decision", async (request) => {
    const params = request.params as { id: string };
    const input = context.parseOptimizationDecisionInput(request.body);
    return context.optimizationService.decideInitiative(params.id, input);
  });

  app.get("/api/expansion/capabilities", async (request) => {
    const query = request.query as {
      sector?: string;
      phase?: "mvp" | "phase_2" | "phase_3";
    };

    return context.expansionService.listCapabilities({
      sector: query.sector,
      phase: query.phase
    });
  });

  app.post("/api/expansion/capabilities", async (request, reply) => {
    const input = context.parseSectorCapabilityCreateInput(request.body);
    const capability = await context.expansionService.createCapability(input);
    return reply.code(201).send(capability);
  });

  app.get("/api/onboarding", async (request) => {
    const query = request.query as {
      sector?: string;
      phase?: "mvp" | "phase_2" | "phase_3";
      status?: "planned" | "ready" | "completed";
    };

    return context.expansionService.listOnboarding({
      sector: query.sector,
      phase: query.phase,
      status: query.status
    });
  });

  app.post("/api/onboarding", async (request, reply) => {
    const input = context.parseAgentOnboardingCreateInput(request.body);
    const onboarding = await context.expansionService.onboardAgent(input);
    return reply.code(201).send(onboarding);
  });

  app.post("/api/handoffs", async (request, reply) => {
    const input = context.parseHandoffCreateInput(request.body);
    const handoff = await context.handoffService.createHandoff(input);
    return reply.code(201).send(handoff);
  });

  app.post("/api/handoffs/:id/escalate", async (request) => {
    const params = request.params as { id: string };
    const input = context.parseHandoffEscalationInput(request.body);
    return context.escalationService.escalateHandoff(params.id, input);
  });

  app.post("/api/handoffs/:id/respond", async (request) => {
    const params = request.params as { id: string };
    const input = context.parseHandoffResponseInput(request.body);
    return context.handoffService.respondToHandoff(params.id, input);
  });

  app.get("/api/escalations", async (request) => {
    const query = request.query as {
      handoffId?: string;
      status?: "open" | "resolved";
    };

    return context.escalationService.listEscalations({
      handoffId: query.handoffId,
      status: query.status
    });
  });

  app.get("/api/governance/gates", async (request) => {
    const query = request.query as {
      flowKey?: "marketing" | "sales" | "technology";
      stage?: "validation" | "approval";
      active?: "true" | "false";
    };

    return context.governancePolicyService.listGatePolicies({
      flowKey: query.flowKey,
      stage: query.stage,
      active:
        query.active === undefined ? undefined : query.active === "true"
    });
  });

  app.post("/api/governance/gates", async (request, reply) => {
    const input = context.parseGovernanceGatePolicyCreateInput(request.body);
    const policy = await context.governancePolicyService.createGatePolicy(input);
    return reply.code(201).send(policy);
  });

  app.post("/api/approvals", async (request, reply) => {
    const input = context.parseApprovalCreateInput(request.body);
    const approval = await context.approvalService.requestApproval(input);
    const governanceSync = await context.planningService.syncGovernanceState({
      planningItemId: approval.planningItemId
    });

    return reply.code(201).send({
      approval,
      governanceSync
    });
  });

  app.post("/api/approvals/:id/decision", async (request, reply) => {
    const role = resolveRoleFromHeaders(request.headers);

    if (!canDecideApproval(role)) {
      return reply.code(403).send({
        message: "Current role cannot decide approvals."
      });
    }

    const params = request.params as { id: string };
    const input = context.parseApprovalDecisionInput(request.body);
    const approval = await context.approvalService.decideApproval(params.id, input);
    const governanceSync = await context.planningService.syncGovernanceState({
      planningItemId: approval.planningItemId
    });

    return {
      approval,
      governanceSync
    };
  });

  app.post("/api/validations", async (request, reply) => {
    const input = context.parseValidationResultInput(request.body);
    const validation = await context.validationService.recordValidation(input);
    const governanceSync = await context.planningService.syncGovernanceState({
      planningItemId: validation.planningItemId
    });

    return reply.code(201).send({
      validation,
      governanceSync
    });
  });

  app.get("/api/boards/executive", async () => {
    return context.boardService.getExecutiveBoard();
  });

  app.get("/api/boards/sectors", async () => {
    return context.boardService.getSectorBoard();
  });

  app.get("/api/reports/executive", async () => {
    return context.reportingService.getExecutiveReport();
  });

  app.post("/api/reports/executive/generate", async (request, reply) => {
    const body = (request.body ?? {}) as {
      reason?: string;
      trigger?: "manual" | "scheduled" | "queue";
    };
    const queued = await context.reportingService.enqueueExecutiveReport({
      trigger: body.trigger ?? "manual",
      reason: body.reason ?? "Manual executive report generation requested via API."
    });

    return reply.code(202).send(queued);
  });

  app.get("/api/reports/executive/history", async (request) => {
    const query = request.query as {
      limit?: string;
    };
    const limit = query.limit ? Number(query.limit) : undefined;
    return context.reportingService.listExecutiveReportSnapshots(limit);
  });

  app.get("/api/boards/handoffs", async () => {
    return context.handoffService.listHandoffs();
  });

  app.setErrorHandler((error, _request, reply) => {
    app.log.error({ err: error }, "Runtime request failed");
    reply.code(400).send({
      message: error instanceof Error ? error.message : "Unexpected error."
    });
  });

  app.addHook("onClose", async () => {
    await context.close();
  });

  return app;
}
