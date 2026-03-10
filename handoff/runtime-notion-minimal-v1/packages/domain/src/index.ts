import { randomUUID } from "node:crypto";
import type {
  AgentProfile,
  AgentOnboarding,
  AgentOnboardingCreateInput,
  ApprovalCreateInput,
  ApprovalDecision,
  ApprovalDecisionInput,
  AuditEvent,
  EscalationRecord,
  ExecutiveReport,
  ExecutiveBoard,
  GovernanceGatePolicy,
  GovernanceGatePolicyCreateInput,
  Handoff,
  HandoffCreateInput,
  HandoffEscalationInput,
  HandoffResponseInput,
  MemoryRecord,
  Mission,
  MissionCreateInput,
  OptimizationCreateInput,
  OptimizationDecisionInput,
  OptimizationInitiative,
  PlanningItem,
  SectorBoard,
  SectorCapability,
  SectorCapabilityCreateInput,
  TaskDashboardItem,
  TaskDashboardResponse,
  ValidationResult,
  ValidationResultInput,
  WorkflowRun
} from "@gmv/contracts";
import {
  agentOnboardingSchema,
  approvalDecisionSchema,
  auditEventSchema,
  escalationRecordSchema,
  executiveReportSchema,
  executiveBoardSchema,
  governanceGatePolicySchema,
  handoffSchema,
  missionSchema,
  optimizationInitiativeSchema,
  sectorBoardSchema,
  taskDashboardResponseSchema,
  validationResultSchema,
  workflowRunSchema
} from "@gmv/contracts";
import { createCorrelationId } from "@gmv/observability";
import type { PlanningSystemAdapter } from "@gmv/notion-adapter";
import type { QueueDriver, QueuePublishResult } from "@gmv/queue";
import { assertRouteAvailable, resolveEscalationTarget } from "./governance.js";
export { BusinessFlowService } from "./business-flows.js";

export interface RuntimeRepository {
  seedAgents(agents: AgentProfile[]): Promise<void>;
  upsertAgent(agent: AgentProfile): Promise<AgentProfile>;
  listAgents(): Promise<AgentProfile[]>;
  getAgentBySlug(slug: string): Promise<AgentProfile | undefined>;
  getAgentById(id: string): Promise<AgentProfile | undefined>;
  createMission(mission: Mission): Promise<Mission>;
  updateMission(missionId: string, patch: Partial<Mission>): Promise<Mission>;
  getMission(missionId: string): Promise<Mission | undefined>;
  listMissions(): Promise<Mission[]>;
  upsertPlanningItems(items: PlanningItem[]): Promise<PlanningItem[]>;
  listPlanningItems(filter?: {
    missionId?: string;
    kind?: PlanningItem["kind"];
  }): Promise<PlanningItem[]>;
  getPlanningItem(id: string): Promise<PlanningItem | undefined>;
  createHandoff(handoff: Handoff): Promise<Handoff>;
  updateHandoff(handoffId: string, patch: Partial<Handoff>): Promise<Handoff>;
  getHandoff(handoffId: string): Promise<Handoff | undefined>;
  listHandoffs(): Promise<Handoff[]>;
  createApproval(approval: ApprovalDecision): Promise<ApprovalDecision>;
  updateApproval(
    approvalId: string,
    patch: Partial<ApprovalDecision>
  ): Promise<ApprovalDecision>;
  getApproval(approvalId: string): Promise<ApprovalDecision | undefined>;
  listApprovals(): Promise<ApprovalDecision[]>;
  createValidation(result: ValidationResult): Promise<ValidationResult>;
  listValidations(): Promise<ValidationResult[]>;
  createWorkflowRun(run: WorkflowRun): Promise<WorkflowRun>;
  listWorkflowRuns(filter?: {
    missionId?: string;
    status?: WorkflowRun["status"];
  }): Promise<WorkflowRun[]>;
  saveMemoryRecord(record: MemoryRecord): Promise<MemoryRecord>;
  listMemoryRecords(filter?: {
    domain?: MemoryRecord["domain"];
    missionId?: string;
    tag?: string;
  }): Promise<MemoryRecord[]>;
  createOptimizationInitiative(
    initiative: OptimizationInitiative
  ): Promise<OptimizationInitiative>;
  updateOptimizationInitiative(
    initiativeId: string,
    patch: Partial<OptimizationInitiative>
  ): Promise<OptimizationInitiative>;
  getOptimizationInitiative(
    initiativeId: string
  ): Promise<OptimizationInitiative | undefined>;
  listOptimizationInitiatives(filter?: {
    missionId?: string;
    sector?: string;
    flowKey?: string;
    status?: OptimizationInitiative["status"];
  }): Promise<OptimizationInitiative[]>;
  createSectorCapability(capability: SectorCapability): Promise<SectorCapability>;
  listSectorCapabilities(filter?: {
    sector?: string;
    phase?: SectorCapability["phase"];
  }): Promise<SectorCapability[]>;
  createAgentOnboarding(record: AgentOnboarding): Promise<AgentOnboarding>;
  listAgentOnboarding(filter?: {
    sector?: string;
    phase?: AgentOnboarding["targetPhase"];
    status?: AgentOnboarding["status"];
  }): Promise<AgentOnboarding[]>;
  createGovernanceGatePolicy(
    policy: GovernanceGatePolicy
  ): Promise<GovernanceGatePolicy>;
  listGovernanceGatePolicies(filter?: {
    flowKey?: GovernanceGatePolicy["flowKey"];
    stage?: GovernanceGatePolicy["stage"];
    active?: boolean;
  }): Promise<GovernanceGatePolicy[]>;
  createEscalationRecord(
    record: EscalationRecord
  ): Promise<EscalationRecord>;
  listEscalationRecords(filter?: {
    handoffId?: string;
    status?: EscalationRecord["status"];
  }): Promise<EscalationRecord[]>;
  appendAuditEvent(event: AuditEvent): Promise<void>;
  listAuditEvents(filter?: { aggregateId?: string }): Promise<AuditEvent[]>;
}

export interface StoryMirror {
  mirrorReadyStories(items: PlanningItem[]): Promise<{
    mirrored: string[];
    skipped: string[];
  }>;
}

export class MissionService {
  constructor(
    private readonly repository: RuntimeRepository,
    private readonly queue: QueueDriver
  ) {}

  async createMission(input: MissionCreateInput): Promise<Mission> {
    const initiator = await this.repository.getAgentBySlug(input.initiator_slug);
    const owner = await this.repository.getAgentBySlug(input.owner_agent_slug);

    if (!initiator) {
      throw new Error(`Unknown initiator slug: ${input.initiator_slug}`);
    }

    if (!owner) {
      throw new Error(`Unknown owner agent slug: ${input.owner_agent_slug}`);
    }

    const now = new Date().toISOString();
    const mission = missionSchema.parse({
      id: randomUUID(),
      title: input.title,
      objective: input.objective,
      context: input.context,
      priority: input.priority,
      status: "accepted",
      processType: input.process_type,
      initiatorId: initiator.id,
      ownerAgentId: owner.id,
      successCriteria: input.success_criteria,
      correlationId: createCorrelationId("mission"),
      createdAt: now,
      updatedAt: now
    });

    await this.repository.createMission(mission);
    await this.repository.appendAuditEvent(createAuditEvent("mission", mission.id, "mission.created", initiator.id, mission.correlationId, {
      title: mission.title,
      priority: mission.priority
    }));

    const queueJob = await this.queue.publish("mission.project-to-notion", {
      missionId: mission.id,
      correlationId: mission.correlationId
    });
    await recordWorkflowRun(this.repository, {
      planningItemId: mission.id,
      handoffId: null,
      queueJobId: queueJob.jobId,
      jobName: queueJob.queueName,
      attempt: 1,
      status: "queued",
      correlationId: mission.correlationId,
      errorSummary: null,
      startedAt: null,
      finishedAt: null,
      payload: {
        missionId: mission.id
      }
    });

    return mission;
  }

  async getMission(missionId: string): Promise<{
    mission: Mission | undefined;
    planningItems: PlanningItem[];
    handoffs: Handoff[];
    approvals: ApprovalDecision[];
    validations: ValidationResult[];
    workflowRuns: WorkflowRun[];
    memoryRecords: MemoryRecord[];
    optimizationInitiatives: OptimizationInitiative[];
    auditEvents: AuditEvent[];
  }> {
    const mission = await this.repository.getMission(missionId);
    const planningItems = await this.repository.listPlanningItems({ missionId });
    const taskIds = new Set(planningItems.map((item) => item.id));
    const handoffs = (await this.repository.listHandoffs()).filter((item) =>
      taskIds.has(item.taskId)
    );
    const approvals = (await this.repository.listApprovals()).filter((item) =>
      taskIds.has(item.planningItemId)
    );
    const validations = (await this.repository.listValidations()).filter((item) =>
      taskIds.has(item.planningItemId)
    );
    const workflowRuns = await this.repository.listWorkflowRuns({ missionId });
    const memoryRecords = await this.repository.listMemoryRecords({ missionId });
    const optimizationInitiatives =
      await this.repository.listOptimizationInitiatives({ missionId });
    const auditEvents = await this.repository.listAuditEvents({ aggregateId: missionId });

    return {
      mission,
      planningItems,
      handoffs,
      approvals,
      validations,
      workflowRuns,
      memoryRecords,
      optimizationInitiatives,
      auditEvents
    };
  }
}

export class AgentDirectoryService {
  constructor(private readonly repository: RuntimeRepository) {}

  async listAgents(filter?: {
    sector?: string;
    phase?: AgentProfile["phase"];
    status?: AgentProfile["status"];
    actorType?: AgentProfile["actorType"];
  }): Promise<AgentProfile[]> {
    const agents = await this.repository.listAgents();

    return agents.filter((agent) => {
      if (filter?.sector && agent.sector !== filter.sector) {
        return false;
      }

      if (filter?.phase && agent.phase !== filter.phase) {
        return false;
      }

      if (filter?.status && agent.status !== filter.status) {
        return false;
      }

      if (filter?.actorType && agent.actorType !== filter.actorType) {
        return false;
      }

      return true;
    });
  }
}

export class PlanningService {
  constructor(
    private readonly repository: RuntimeRepository,
    private readonly planningAdapter: PlanningSystemAdapter,
    private readonly storyMirror: StoryMirror,
    private readonly queue: QueueDriver
  ) {}

  async projectMissionToPlanningSystem(missionId: string): Promise<Mission> {
    const mission = await this.repository.getMission(missionId);

    if (!mission) {
      throw new Error(`Mission not found: ${missionId}`);
    }

    const projection = await this.planningAdapter.projectMission(mission);
    const updated = await this.repository.updateMission(mission.id, {
      notionProjectPageId: projection.pageId,
      notionProjectUrl: projection.url,
      status: "projected",
      updatedAt: new Date().toISOString()
    });

    await this.repository.appendAuditEvent(createAuditEvent("mission", mission.id, "mission.projected", mission.ownerAgentId, mission.correlationId, {
      notionProjectPageId: projection.pageId
    }));

    return updated;
  }

  async syncPlanningTree(): Promise<{
    items: PlanningItem[];
    mirrored: string[];
    skipped: string[];
  }> {
    const snapshot = await this.planningAdapter.pullPlanningSnapshot();
    const items = await this.repository.upsertPlanningItems(snapshot.items);
    const mirrorResult = await this.storyMirror.mirrorReadyStories(items);

    for (const item of items) {
      await this.repository.appendAuditEvent(createAuditEvent("planning_item", item.id, "planning_item.synced", item.ownerAgentId ?? null, createCorrelationId("sync"), {
        kind: item.kind,
        planningStatus: item.planningStatus,
        executionStatus: item.executionStatus
      }));
    }

    return {
      items,
      mirrored: mirrorResult.mirrored,
      skipped: mirrorResult.skipped
    };
  }

  async enqueuePlanningSync(): Promise<QueuePublishResult & {
    correlationId: string;
  }> {
    const correlationId = createCorrelationId("planning_sync");
    const queueJob = await this.queue.publish("planning.sync-from-notion", {
      correlationId
    });

    await recordWorkflowRun(this.repository, {
      planningItemId: null,
      handoffId: null,
      queueJobId: queueJob.jobId,
      jobName: queueJob.queueName,
      attempt: 1,
      status: "queued",
      correlationId,
      errorSummary: null,
      startedAt: null,
      finishedAt: null,
      payload: {}
    });

    return {
      ...queueJob,
      correlationId
    };
  }

  async syncGovernanceState(filter?: {
    missionId?: string;
    planningItemId?: string;
  }): Promise<{
    updated: string[];
    skipped: Array<{
      planningItemId: string;
      reason: string;
    }>;
  }> {
    const [planningItems, approvals, validations, handoffs] = await Promise.all([
      this.repository.listPlanningItems({
        missionId: filter?.missionId
      }),
      this.repository.listApprovals(),
      this.repository.listValidations(),
      this.repository.listHandoffs()
    ]);

    const selectedItems = planningItems.filter((item) => {
      if (filter?.planningItemId && item.id !== filter.planningItemId) {
        return false;
      }

      const hasApproval = approvals.some(
        (approval) => approval.planningItemId === item.id
      );
      const hasValidation = validations.some(
        (validation) => validation.planningItemId === item.id
      );
      const hasValidationRequest = handoffs.some(
        (handoff) => handoff.taskId === item.id && handoff.needsValidation
      );

      return hasApproval || hasValidation || item.validationNeeded || hasValidationRequest;
    });

    if (!this.planningAdapter.enabled) {
      return {
        updated: [],
        skipped: selectedItems.map((item) => ({
          planningItemId: item.id,
          reason: "Planning system integration is disabled."
        }))
      };
    }

    const syncPayload = selectedItems.map((item) => {
      const latestApproval = latestByTimestamp(
        approvals.filter((approval) => approval.planningItemId === item.id),
        (approval) => approval.decidedAt ?? approval.createdAt
      );
      const latestValidation = latestByTimestamp(
        validations.filter((validation) => validation.planningItemId === item.id),
        (validation) => validation.validatedAt
      );
      const handoffNeedsValidation = handoffs.some(
        (handoff) => handoff.taskId === item.id && handoff.needsValidation
      );
      const validationNeeded = item.validationNeeded || handoffNeedsValidation;
      const validationStatus: "pending" | "passed" | "failed" | "warning" | null =
        latestValidation?.status ?? (validationNeeded ? "pending" : null);

      return {
        planningItemId: item.id,
        notionPageId: item.notionPageId ?? null,
        kind: item.kind,
        planningStatus: item.planningStatus,
        executionStatus: item.executionStatus,
        validationNeeded,
        validationStatus,
        validationType: latestValidation?.validationType ?? null,
        validationFindings: latestValidation?.findings ?? [],
        approvalStatus: latestApproval?.status ?? null,
        approvalType: latestApproval?.approvalType ?? null,
        approvalNotes: latestApproval?.decisionNotes ?? null
      };
    });

    const result = await this.planningAdapter.syncGovernanceState(syncPayload);

    for (const planningItemId of result.updated) {
      await this.repository.appendAuditEvent(
        createAuditEvent(
          "planning_item",
          planningItemId,
          "planning_item.governance_synced",
          null,
          createCorrelationId("governance_sync"),
          {
            missionId: filter?.missionId ?? null
          }
        )
      );
    }

    return result;
  }
}

export class HandoffService {
  constructor(private readonly repository: RuntimeRepository) {}

  async createHandoff(input: HandoffCreateInput): Promise<Handoff> {
    const task = await this.repository.getPlanningItem(input.task_id);

    if (!task || task.kind !== "task") {
      throw new Error("Handoff requires an existing planning task.");
    }

    const origin = await this.resolveAgent(input.origin_agent);
    const target = await this.resolveAgent(input.target_agent);
    await assertRouteAvailable(this.repository, origin, target);
    const now = new Date().toISOString();

    const handoff = handoffSchema.parse({
      id: randomUUID(),
      taskId: task.id,
      originAgentId: origin.id,
      targetAgentId: target.id,
      taskType: input.task_type,
      priority: input.priority,
      context: input.context,
      input: input.input,
      expectedOutput: input.expected_output,
      deadline: input.deadline,
      validationRules: input.validation_rules,
      status: "pending",
      result: {},
      confidence: null,
      notes: "",
      needsValidation: false,
      createdAt: now,
      updatedAt: now
    });

    await this.repository.createHandoff(handoff);
    await this.repository.appendAuditEvent(createAuditEvent("handoff", handoff.id, "handoff.created", origin.id, createCorrelationId("handoff"), {
      taskId: handoff.taskId,
      targetAgentId: handoff.targetAgentId
    }));

    return handoff;
  }

  async respondToHandoff(
    handoffId: string,
    input: HandoffResponseInput
  ): Promise<Handoff> {
    const existing = await this.repository.getHandoff(handoffId);

    if (!existing) {
      throw new Error(`Handoff not found: ${handoffId}`);
    }

    const nextStatus =
      input.status === "needs_changes" ? "rejected" : input.status;

    const updated = await this.repository.updateHandoff(handoffId, {
      status: nextStatus,
      result: input.result,
      confidence: input.confidence,
      notes: input.notes,
      needsValidation: input.needs_validation,
      updatedAt: new Date().toISOString()
    });

    await this.repository.appendAuditEvent(createAuditEvent("handoff", updated.id, "handoff.responded", updated.targetAgentId, createCorrelationId("handoff"), {
      status: updated.status,
      needsValidation: updated.needsValidation
    }));

    return updated;
  }

  async listHandoffs(): Promise<Handoff[]> {
    return this.repository.listHandoffs();
  }

  private async resolveAgent(identifier: string): Promise<AgentProfile> {
    const bySlug = await this.repository.getAgentBySlug(identifier);
    if (bySlug) {
      return bySlug;
    }

    const byId = await this.repository.getAgentById(identifier);
    if (!byId) {
      throw new Error(`Unknown agent: ${identifier}`);
    }

    return byId;
  }
}

export class ApprovalService {
  constructor(private readonly repository: RuntimeRepository) {}

  async requestApproval(input: ApprovalCreateInput): Promise<ApprovalDecision> {
    const planningItem = await this.repository.getPlanningItem(input.planning_item_id);

    if (!planningItem) {
      throw new Error(`Planning item not found: ${input.planning_item_id}`);
    }

    const requester = await this.resolveAgent(input.requested_by_agent);
    const approver = await this.resolveAgent(input.approver_agent);

    return this.createApproval({
      planningItemId: planningItem.id,
      requestedByAgentId: requester.id,
      approverAgentId: approver.id,
      approvalType: input.approval_type
    });
  }

  async createApproval(input: {
    planningItemId: string;
    requestedByAgentId: string;
    approverAgentId: string;
    approvalType: string;
  }): Promise<ApprovalDecision> {
    const approval = approvalDecisionSchema.parse({
      id: randomUUID(),
      planningItemId: input.planningItemId,
      requestedByAgentId: input.requestedByAgentId,
      approverAgentId: input.approverAgentId,
      approvalType: input.approvalType,
      status: "pending",
      decisionNotes: "",
      createdAt: new Date().toISOString()
    });

    await this.repository.createApproval(approval);
    await this.repository.appendAuditEvent(
      createAuditEvent(
        "approval",
        approval.id,
        "approval.created",
        approval.requestedByAgentId,
        createCorrelationId("approval"),
        {
          planningItemId: approval.planningItemId,
          approverAgentId: approval.approverAgentId
        }
      )
    );
    return approval;
  }

  async decideApproval(
    approvalId: string,
    input: ApprovalDecisionInput
  ): Promise<ApprovalDecision> {
    const approval = await this.repository.getApproval(approvalId);

    if (!approval) {
      throw new Error(`Approval not found: ${approvalId}`);
    }

    const updated = await this.repository.updateApproval(approvalId, {
      status: input.status,
      decisionNotes: input.decision_notes,
      decidedAt: new Date().toISOString()
    });

    await this.repository.appendAuditEvent(createAuditEvent("approval", updated.id, "approval.decided", updated.approverAgentId, createCorrelationId("approval"), {
      status: updated.status
    }));

    return updated;
  }

  async listApprovals(): Promise<ApprovalDecision[]> {
    return this.repository.listApprovals();
  }

  private async resolveAgent(slug: string): Promise<AgentProfile> {
    const agent = await this.repository.getAgentBySlug(slug);

    if (!agent) {
      throw new Error(`Agent not found for approval flow: ${slug}`);
    }

    return agent;
  }
}

export class ValidationService {
  constructor(private readonly repository: RuntimeRepository) {}

  async recordValidation(input: ValidationResultInput): Promise<ValidationResult> {
    const planningItem = await this.repository.getPlanningItem(input.planning_item_id);

    if (!planningItem) {
      throw new Error(`Planning item not found: ${input.planning_item_id}`);
    }

    const validator = await this.resolveAgent(input.validator_agent);
    const validation = validationResultSchema.parse({
      id: randomUUID(),
      planningItemId: planningItem.id,
      validatorAgentId: validator.id,
      validationType: input.validation_type,
      status: input.status,
      findings: input.findings,
      validatedAt: new Date().toISOString()
    });

    await this.repository.createValidation(validation);
    await this.repository.appendAuditEvent(
      createAuditEvent(
        "validation",
        validation.id,
        "validation.recorded",
        validator.id,
        createCorrelationId("validation"),
        {
          planningItemId: validation.planningItemId,
          status: validation.status,
          validationType: validation.validationType
        }
      )
    );

    return validation;
  }

  async listValidations(): Promise<ValidationResult[]> {
    return this.repository.listValidations();
  }

  private async resolveAgent(identifier: string): Promise<AgentProfile> {
    const bySlug = await this.repository.getAgentBySlug(identifier);
    if (bySlug) {
      return bySlug;
    }

    const byId = await this.repository.getAgentById(identifier);
    if (!byId) {
      throw new Error(`Unknown agent: ${identifier}`);
    }

    return byId;
  }
}

export class GovernancePolicyService {
  constructor(private readonly repository: RuntimeRepository) {}

  async createGatePolicy(
    input: GovernanceGatePolicyCreateInput
  ): Promise<GovernanceGatePolicy> {
    if (input.scope === "task" && !input.task_slug) {
      throw new Error("Task-scoped governance policies require task_slug.");
    }

    if (input.stage === "validation") {
      if (!input.validator_slug || !input.validation_type) {
        throw new Error(
          "Validation governance policies require validator_slug and validation_type."
        );
      }

      if (!input.initial_validation_status) {
        throw new Error(
          "Validation governance policies require initial_validation_status."
        );
      }
    }

    if (input.stage === "approval") {
      if (!input.requested_by_slug || !input.approver_slug || !input.approval_type) {
        throw new Error(
          "Approval governance policies require requested_by_slug, approver_slug and approval_type."
        );
      }
    }

    await this.resolveReferencedAgents(input);

    const now = new Date().toISOString();
    const policy = governanceGatePolicySchema.parse({
      id: randomUUID(),
      key: input.key,
      flowKey: input.flow_key,
      stage: input.stage,
      scope: input.scope,
      taskSlug: input.task_slug ?? null,
      sector: input.sector,
      active: input.active,
      validatorSlug: input.validator_slug ?? null,
      validationType: input.validation_type ?? null,
      initialValidationStatus: input.initial_validation_status ?? null,
      findingsTemplate: input.findings_template,
      requestedBySlug: input.requested_by_slug ?? null,
      approverSlug: input.approver_slug ?? null,
      approvalType: input.approval_type ?? null,
      decisionNotesTemplate: input.decision_notes_template,
      createdAt: now,
      updatedAt: now
    });

    await this.repository.createGovernanceGatePolicy(policy);
    await this.repository.appendAuditEvent(
      createAuditEvent(
        "governance_gate_policy",
        policy.id,
        "governance_gate_policy.created",
        null,
        createCorrelationId("governance"),
        {
          key: policy.key,
          flowKey: policy.flowKey,
          stage: policy.stage,
          scope: policy.scope
        }
      )
    );

    return policy;
  }

  async listGatePolicies(filter?: {
    flowKey?: GovernanceGatePolicy["flowKey"];
    stage?: GovernanceGatePolicy["stage"];
    active?: boolean;
  }): Promise<GovernanceGatePolicy[]> {
    return this.repository.listGovernanceGatePolicies(filter);
  }

  private async resolveReferencedAgents(
    input: GovernanceGatePolicyCreateInput
  ): Promise<void> {
    const identifiers = [
      input.validator_slug,
      input.requested_by_slug,
      input.approver_slug
    ].filter(Boolean) as string[];

    for (const identifier of identifiers) {
      await this.resolveAgent(identifier);
    }
  }

  private async resolveAgent(identifier: string): Promise<AgentProfile> {
    const bySlug = await this.repository.getAgentBySlug(identifier);
    if (bySlug) {
      return bySlug;
    }

    const byId = await this.repository.getAgentById(identifier);
    if (!byId) {
      throw new Error(`Unknown agent: ${identifier}`);
    }

    return byId;
  }
}

export class EscalationService {
  constructor(private readonly repository: RuntimeRepository) {}

  async escalateHandoff(
    handoffId: string,
    input: HandoffEscalationInput
  ): Promise<{
    record: EscalationRecord;
    handoff: Handoff;
  }> {
    const handoff = await this.repository.getHandoff(handoffId);

    if (!handoff) {
      throw new Error(`Handoff not found: ${handoffId}`);
    }

    if (
      handoff.status === "completed" ||
      handoff.status === "expired" ||
      handoff.status === "failed" ||
      handoff.status === "escalated"
    ) {
      throw new Error(`Handoff cannot be escalated from status: ${handoff.status}`);
    }

    const currentTarget = await this.resolveAgent(handoff.targetAgentId);
    const nextStep = input.force_target
      ? {
          target: await this.resolveAgent(input.force_target),
          level: await this.resolveForcedLevel(currentTarget, input.force_target)
        }
      : await resolveEscalationTarget(this.repository, currentTarget);

    await assertRouteAvailable(this.repository, currentTarget, nextStep.target);

    const now = new Date().toISOString();
    const correlationId = createCorrelationId("escalation");
    const replacement = handoffSchema.parse({
      id: randomUUID(),
      taskId: handoff.taskId,
      originAgentId: currentTarget.id,
      targetAgentId: nextStep.target.id,
      taskType: handoff.taskType,
      priority: handoff.priority,
      context: {
        ...handoff.context,
        escalation: {
          fromHandoffId: handoff.id,
          reason: input.reason,
          note: input.note
        }
      },
      input: handoff.input,
      expectedOutput: handoff.expectedOutput,
      deadline: handoff.deadline,
      validationRules: handoff.validationRules,
      status: "pending",
      result: {},
      confidence: null,
      notes: input.note,
      needsValidation: handoff.needsValidation,
      createdAt: now,
      updatedAt: now
    });
    const record = escalationRecordSchema.parse({
      id: randomUUID(),
      handoffId: handoff.id,
      replacementHandoffId: replacement.id,
      fromAgentId: currentTarget.id,
      toAgentId: nextStep.target.id,
      level: nextStep.level,
      reason: input.reason,
      note: input.note,
      status: "open",
      createdAt: now,
      resolvedAt: null
    });

    await this.repository.updateHandoff(handoff.id, {
      status: "escalated",
      notes: appendHandoffNote(handoff.notes, input.reason, input.note),
      updatedAt: now
    });
    await this.repository.createHandoff(replacement);
    await this.repository.createEscalationRecord(record);

    await this.repository.appendAuditEvent(
      createAuditEvent("handoff", handoff.id, "handoff.escalated", currentTarget.id, correlationId, {
        replacementHandoffId: replacement.id,
        toAgentId: nextStep.target.id,
        level: nextStep.level
      })
    );
    await this.repository.appendAuditEvent(
      createAuditEvent(
        "handoff",
        replacement.id,
        "handoff.escalation_replacement_created",
        currentTarget.id,
        correlationId,
        {
          sourceHandoffId: handoff.id,
          targetAgentId: replacement.targetAgentId,
          level: nextStep.level
        }
      )
    );
    await this.repository.appendAuditEvent(
      createAuditEvent(
        "escalation",
        record.id,
        "escalation.created",
        currentTarget.id,
        correlationId,
        {
          handoffId: handoff.id,
          replacementHandoffId: replacement.id,
          level: record.level
        }
      )
    );

    return {
      record,
      handoff: replacement
    };
  }

  async listEscalations(filter?: {
    handoffId?: string;
    status?: EscalationRecord["status"];
  }): Promise<EscalationRecord[]> {
    return this.repository.listEscalationRecords(filter);
  }

  private async resolveForcedLevel(
    currentTarget: AgentProfile,
    nextTargetIdentifier: string
  ): Promise<EscalationRecord["level"]> {
    const nextTarget = await this.resolveAgent(nextTargetIdentifier);

    if (nextTarget.actorType === "founder") {
      return "to_founder";
    }

    if (nextTarget.actorType === "ceo") {
      return "to_ceo";
    }

    if (nextTarget.actorType === "c_level") {
      return "to_c_level";
    }

    throw new Error(
      `Forced escalation target must be founder, ceo or c_level: ${currentTarget.slug} -> ${nextTarget.slug}`
    );
  }

  private async resolveAgent(identifier: string): Promise<AgentProfile> {
    const bySlug = await this.repository.getAgentBySlug(identifier);
    if (bySlug) {
      return bySlug;
    }

    const byId = await this.repository.getAgentById(identifier);
    if (!byId) {
      throw new Error(`Unknown agent: ${identifier}`);
    }

    return byId;
  }
}

export class BoardService {
  constructor(private readonly repository: RuntimeRepository) {}

  async getExecutiveBoard(): Promise<ExecutiveBoard> {
    const missions = await this.repository.listMissions();
    const planningItems = await this.repository.listPlanningItems();
    const approvals = await this.repository.listApprovals();
    const handoffs = await this.repository.listHandoffs();
    const byStatus = missions.reduce<Record<string, number>>((acc, mission) => {
      acc[mission.status] = (acc[mission.status] ?? 0) + 1;
      return acc;
    }, {});

    const bySector = planningItems.reduce<ExecutiveBoard["planning"]["bySector"]>((acc, item) => {
      const bucket = acc[item.sector] ?? { ready: 0, inProgress: 0, blocked: 0 };

      if (item.planningStatus === "ready") {
        bucket.ready += 1;
      }

      if (item.executionStatus === "running") {
        bucket.inProgress += 1;
      }

      if (item.executionStatus === "blocked") {
        bucket.blocked += 1;
      }

      acc[item.sector] = bucket;
      return acc;
    }, {});

    return executiveBoardSchema.parse({
      missions: {
        total: missions.length,
        byStatus
      },
      handoffs: {
        total: handoffs.length,
        pending: handoffs.filter((item) => item.status === "pending").length,
        needsValidation: handoffs.filter((item) => item.needsValidation).length
      },
      approvals: {
        pending: approvals.filter((item) => item.status === "pending").length,
        total: approvals.length
      },
      planning: {
        bySector
      }
    });
  }

  async getSectorBoard(): Promise<SectorBoard> {
    const planningItems = await this.repository.listPlanningItems();
    const handoffs = await this.repository.listHandoffs();
    const approvals = await this.repository.listApprovals();
    const validations = await this.repository.listValidations();
    const agents = await this.repository.listAgents();
    const agentById = new Map(agents.map((agent) => [agent.id, agent]));
    const validationTypesByPlanningItem = validations.reduce<
      Map<string, ValidationResult[]>
    >((acc, validation) => {
      const bucket = acc.get(validation.planningItemId) ?? [];
      bucket.push(validation);
      acc.set(validation.planningItemId, bucket);
      return acc;
    }, new Map());
    const board: SectorBoard["sectors"] = {};

    const ensureSector = (sector: PlanningItem["sector"]) => {
      board[sector] ??= {
        planningItems: 0,
        readyItems: 0,
        inProgressItems: 0,
        blockedItems: 0,
        completedItems: 0,
        handoffsIn: 0,
        handoffsOut: 0,
        pendingApprovals: 0,
        pendingValidations: 0
      };

      return board[sector];
    };

    for (const item of planningItems) {
      const bucket = ensureSector(item.sector);
      bucket.planningItems += 1;

      if (item.planningStatus === "ready") {
        bucket.readyItems += 1;
      }

      if (item.executionStatus === "running" || item.executionStatus === "queued") {
        bucket.inProgressItems += 1;
      }

      if (item.executionStatus === "blocked") {
        bucket.blockedItems += 1;
      }

      if (item.executionStatus === "completed") {
        bucket.completedItems += 1;
      }

      const itemValidations = validationTypesByPlanningItem.get(item.id) ?? [];
      const hasPassedValidation = itemValidations.some(
        (validation) => validation.status === "passed"
      );

      if (item.validationNeeded && !hasPassedValidation) {
        bucket.pendingValidations += 1;
      }
    }

    for (const handoff of handoffs) {
      const originSector = agentById.get(handoff.originAgentId)?.sector ?? "operations";
      const targetSector = agentById.get(handoff.targetAgentId)?.sector ?? "operations";

      ensureSector(originSector).handoffsOut += 1;
      ensureSector(targetSector).handoffsIn += 1;
    }

    for (const approval of approvals) {
      if (approval.status !== "pending") {
        continue;
      }

      const planningItem = planningItems.find(
        (item) => item.id === approval.planningItemId
      );
      const sector =
        planningItem?.sector ??
        agentById.get(approval.approverAgentId)?.sector ??
        "operations";

      ensureSector(sector).pendingApprovals += 1;
    }

    return sectorBoardSchema.parse({
      sectors: board
    });
  }
}

export class TaskBoardService {
  constructor(private readonly repository: RuntimeRepository) {}

  async getTaskDashboard(filter?: {
    missionId?: string;
    sector?: string;
    planningStatus?: PlanningItem["planningStatus"];
    executionStatus?: PlanningItem["executionStatus"];
    owner?: string;
  }): Promise<TaskDashboardResponse> {
    const [tasks, agents, missions, validations, approvals, handoffs] =
      await Promise.all([
        this.repository.listPlanningItems({
          missionId: filter?.missionId,
          kind: "task"
        }),
        this.repository.listAgents(),
        this.repository.listMissions(),
        this.repository.listValidations(),
        this.repository.listApprovals(),
        this.repository.listHandoffs()
      ]);
    const agentById = new Map(agents.map((agent) => [agent.id, agent]));
    const agentBySlug = new Map(agents.map((agent) => [agent.slug, agent]));
    const missionById = new Map(missions.map((mission) => [mission.id, mission]));

    const items = tasks
      .filter((task) => {
        if (filter?.sector && task.sector !== filter.sector) {
          return false;
        }

        if (
          filter?.planningStatus &&
          task.planningStatus !== filter.planningStatus
        ) {
          return false;
        }

        if (
          filter?.executionStatus &&
          task.executionStatus !== filter.executionStatus
        ) {
          return false;
        }

        if (filter?.owner) {
          const owner =
            (task.ownerAgentId
              ? agentById.get(task.ownerAgentId) ??
                agentBySlug.get(task.ownerAgentId)
              : undefined) ?? null;

          if (
            task.ownerAgentId !== filter.owner &&
            owner?.id !== filter.owner &&
            owner?.slug !== filter.owner
          ) {
            return false;
          }
        }

        return true;
      })
      .map((task) =>
        this.toTaskDashboardItem(
          task,
          missionById,
          agentById,
          agentBySlug,
          validations,
          approvals,
          handoffs
        )
      )
      .sort((left, right) => {
        const priorityWeight = getPriorityWeight(right.priority) - getPriorityWeight(left.priority);

        if (priorityWeight !== 0) {
          return priorityWeight;
        }

        return right.updatedAt.localeCompare(left.updatedAt);
      });

    return taskDashboardResponseSchema.parse({
      generatedAt: new Date().toISOString(),
      summary: {
        total: items.length,
        ready: items.filter((item) => item.planningStatus === "ready").length,
        queued: items.filter((item) => item.executionStatus === "queued").length,
        running: items.filter((item) => item.executionStatus === "running").length,
        blocked: items.filter((item) => item.executionStatus === "blocked").length,
        waitingValidation: items.filter(
          (item) =>
            item.planningStatus === "waiting_validation" ||
            item.validationState === "pending"
        ).length,
        completed: items.filter((item) => item.executionStatus === "completed").length,
        unassigned: items.filter((item) => !item.ownerAgentId).length
      },
      items
    });
  }

  private toTaskDashboardItem(
    task: PlanningItem,
    missionById: Map<string, Mission>,
    agentById: Map<string, AgentProfile>,
    agentBySlug: Map<string, AgentProfile>,
    validations: ValidationResult[],
    approvals: ApprovalDecision[],
    handoffs: Handoff[]
  ): TaskDashboardItem {
    const owner =
      (task.ownerAgentId
        ? agentById.get(task.ownerAgentId) ?? agentBySlug.get(task.ownerAgentId)
        : undefined) ?? null;
    const itemValidations = validations.filter(
      (validation) => validation.planningItemId === task.id
    );
    const validationState = resolveValidationState(
      task.validationNeeded,
      itemValidations
    );

    return {
      id: task.id,
      title: task.title,
      missionId: task.missionId,
      missionTitle: missionById.get(task.missionId)?.title ?? "Mission not found",
      sector: task.sector,
      priority: task.priority,
      processType: task.processType,
      planningStatus: task.planningStatus,
      executionStatus: task.executionStatus,
      ownerAgentId: owner?.id ?? task.ownerAgentId ?? null,
      ownerAgentName: owner?.name ?? "Unassigned",
      ownerAgentSlug: owner?.slug ?? null,
      validationNeeded: task.validationNeeded,
      validationState,
      pendingApprovals: approvals.filter(
        (approval) =>
          approval.planningItemId === task.id && approval.status === "pending"
      ).length,
      openHandoffs: handoffs.filter(
        (handoff) =>
          handoff.taskId === task.id &&
          (handoff.status === "pending" ||
            handoff.status === "accepted" ||
            handoff.status === "running" ||
            handoff.status === "escalated")
      ).length,
      externalUrl: task.externalUrl,
      updatedAt: task.updatedAt
    };
  }
}

export class WorkflowService {
  constructor(private readonly repository: RuntimeRepository) {}

  async recordRun(run: WorkflowRun): Promise<WorkflowRun> {
    await recordWorkflowRun(this.repository, {
      planningItemId: run.planningItemId ?? null,
      handoffId: run.handoffId ?? null,
      queueJobId: run.queueJobId ?? null,
      jobName: run.jobName,
      attempt: run.attempt,
      status: run.status,
      correlationId: run.correlationId,
      errorSummary: run.errorSummary ?? null,
      startedAt: run.startedAt ?? null,
      finishedAt: run.finishedAt ?? null,
      payload: {}
    }, run.id);
    return run;
  }

  async listRuns(filter?: {
    missionId?: string;
    status?: WorkflowRun["status"];
  }): Promise<WorkflowRun[]> {
    return this.repository.listWorkflowRuns(filter);
  }
}

async function recordWorkflowRun(
  repository: RuntimeRepository,
  input: {
    planningItemId: string | null;
    handoffId: string | null;
    queueJobId: string | null;
    jobName: string;
    attempt: number;
    status: WorkflowRun["status"];
    correlationId: string;
    errorSummary: string | null;
    startedAt: string | null;
    finishedAt: string | null;
    payload: Record<string, unknown>;
  },
  workflowRunId?: string
): Promise<WorkflowRun> {
  const run = workflowRunSchema.parse({
    id: workflowRunId ?? randomUUID(),
    planningItemId: input.planningItemId,
    handoffId: input.handoffId,
    queueJobId: input.queueJobId,
    jobName: input.jobName,
    attempt: input.attempt,
    status: input.status,
    correlationId: input.correlationId,
    errorSummary: input.errorSummary,
    startedAt: input.startedAt,
    finishedAt: input.finishedAt,
    createdAt: new Date().toISOString()
  });

  await repository.createWorkflowRun(run);
  await repository.appendAuditEvent(
    createAuditEvent(
      "workflow_run",
      run.id,
      `workflow.${run.status}`,
      null,
      run.correlationId,
      {
        planningItemId: run.planningItemId ?? null,
        handoffId: run.handoffId ?? null,
        queueJobId: run.queueJobId ?? null,
        jobName: run.jobName,
        attempt: run.attempt,
        ...input.payload
      }
    )
  );

  return run;
}

export class OptimizationService {
  constructor(private readonly repository: RuntimeRepository) {}

  async createInitiative(input: OptimizationCreateInput): Promise<OptimizationInitiative> {
    const owner = await this.resolveAgent(input.owner_agent);
    const now = new Date().toISOString();
    const initiative = optimizationInitiativeSchema.parse({
      id: randomUUID(),
      title: input.title,
      sector: input.sector,
      flowKey: input.flow_key ?? null,
      sourceType: input.source_type,
      sourceRef: input.source_ref,
      hypothesis: input.hypothesis,
      ownerAgentId: owner.id,
      linkedMissionId: input.linked_mission_id,
      linkedPlanningItemId: input.linked_planning_item_id,
      linkedValidationId: input.linked_validation_id,
      successCriteria: input.success_criteria,
      testStart: input.test_start,
      testEnd: input.test_end,
      status: "proposed",
      decision: "pending",
      resultSummary: "",
      learnings: [],
      createdAt: now,
      updatedAt: now
    });

    await this.repository.createOptimizationInitiative(initiative);
    await this.repository.appendAuditEvent(
      createAuditEvent(
        "optimization",
        initiative.id,
        "optimization.created",
        owner.id,
        createCorrelationId("optimization"),
        {
          sector: initiative.sector,
          flowKey: initiative.flowKey,
          sourceType: initiative.sourceType,
          sourceRef: initiative.sourceRef
        }
      )
    );

    return initiative;
  }

  async decideInitiative(
    initiativeId: string,
    input: OptimizationDecisionInput
  ): Promise<OptimizationInitiative> {
    const initiative = await this.repository.getOptimizationInitiative(initiativeId);

    if (!initiative) {
      throw new Error(`Optimization initiative not found: ${initiativeId}`);
    }

    const updated = await this.repository.updateOptimizationInitiative(initiativeId, {
      status: input.status,
      decision: input.decision,
      resultSummary: input.result_summary,
      learnings: input.learnings,
      updatedAt: new Date().toISOString()
    });

    await this.repository.appendAuditEvent(
      createAuditEvent(
        "optimization",
        updated.id,
        "optimization.decided",
        updated.ownerAgentId,
        createCorrelationId("optimization"),
        {
          status: updated.status,
          decision: updated.decision
        }
      )
    );

    return updated;
  }

  async listInitiatives(filter?: {
    missionId?: string;
    sector?: string;
    flowKey?: string;
    status?: OptimizationInitiative["status"];
  }): Promise<OptimizationInitiative[]> {
    return this.repository.listOptimizationInitiatives(filter);
  }

  private async resolveAgent(identifier: string): Promise<AgentProfile> {
    const bySlug = await this.repository.getAgentBySlug(identifier);
    if (bySlug) {
      return bySlug;
    }

    const byId = await this.repository.getAgentById(identifier);
    if (!byId) {
      throw new Error(`Unknown agent: ${identifier}`);
    }

    return byId;
  }
}

export class ExpansionService {
  constructor(private readonly repository: RuntimeRepository) {}

  async createCapability(input: SectorCapabilityCreateInput): Promise<SectorCapability> {
    const owner = input.owner_agent
      ? await this.resolveAgent(input.owner_agent)
      : undefined;
    const now = new Date().toISOString();
    const capability: SectorCapability = {
      id: randomUUID(),
      sector: input.sector,
      capability: input.capability,
      phase: input.phase,
      status: input.status,
      workflowKeys: input.workflow_keys,
      memoryDomains: input.memory_domains,
      ownerAgentId: owner?.id ?? null,
      createdAt: now,
      updatedAt: now
    };

    await this.repository.createSectorCapability(capability);
    await this.repository.appendAuditEvent(
      createAuditEvent(
        "sector_capability",
        capability.id,
        "sector_capability.created",
        owner?.id ?? null,
        createCorrelationId("expansion"),
        {
          sector: capability.sector,
          capability: capability.capability,
          phase: capability.phase
        }
      )
    );

    return capability;
  }

  async listCapabilities(filter?: {
    sector?: string;
    phase?: SectorCapability["phase"];
  }): Promise<SectorCapability[]> {
    return this.repository.listSectorCapabilities(filter);
  }

  async onboardAgent(input: AgentOnboardingCreateInput): Promise<AgentOnboarding> {
    const agent: AgentProfile = {
      id: randomUUID(),
      name: input.agent_name,
      slug: input.agent_slug,
      actorType: input.actor_type,
      sector: input.sector,
      phase: input.target_phase,
      status: "paused",
      roles: input.roles,
      createdAt: new Date().toISOString()
    };

    await this.repository.upsertAgent(agent);

    const onboarding = agentOnboardingSchema.parse({
      id: randomUUID(),
      agentId: agent.id,
      agentName: agent.name,
      agentSlug: agent.slug,
      actorType: agent.actorType,
      sector: agent.sector,
      targetPhase: input.target_phase,
      status: "planned",
      workflowKeys: input.workflow_keys,
      requiredMemoryDomains: input.required_memory_domains,
      checklist:
        input.checklist.length > 0
          ? input.checklist
          : [
              "Confirmar owner e responsabilidade do agente",
              "Associar workflows e memoria de dominio",
              "Validar readiness antes de ativacao"
            ],
      linkedCapabilityId: input.linked_capability_id ?? null,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    });

    await this.repository.createAgentOnboarding(onboarding);
    await this.repository.appendAuditEvent(
      createAuditEvent(
        "agent_onboarding",
        onboarding.id,
        "agent_onboarding.created",
        agent.id,
        createCorrelationId("onboarding"),
        {
          sector: onboarding.sector,
          phase: onboarding.targetPhase,
          linkedCapabilityId: onboarding.linkedCapabilityId
        }
      )
    );

    return onboarding;
  }

  async listOnboarding(filter?: {
    sector?: string;
    phase?: AgentOnboarding["targetPhase"];
    status?: AgentOnboarding["status"];
  }): Promise<AgentOnboarding[]> {
    return this.repository.listAgentOnboarding(filter);
  }

  private async resolveAgent(identifier: string): Promise<AgentProfile> {
    const bySlug = await this.repository.getAgentBySlug(identifier);
    if (bySlug) {
      return bySlug;
    }

    const byId = await this.repository.getAgentById(identifier);
    if (!byId) {
      throw new Error(`Unknown agent: ${identifier}`);
    }

    return byId;
  }
}

export class ReportingService {
  constructor(private readonly repository: RuntimeRepository) {}

  async getExecutiveReport(): Promise<ExecutiveReport> {
    const missions = await this.repository.listMissions();
    const planningItems = await this.repository.listPlanningItems();
    const handoffs = await this.repository.listHandoffs();
    const approvals = await this.repository.listApprovals();
    const validations = await this.repository.listValidations();
    const workflowRuns = await this.repository.listWorkflowRuns();
    const memoryRecords = await this.repository.listMemoryRecords();
    const optimizationInitiatives =
      await this.repository.listOptimizationInitiatives();
    const sectorCapabilities = await this.repository.listSectorCapabilities();
    const onboardingRecords = await this.repository.listAgentOnboarding();
    const memoryCoverage = memoryRecords.reduce<Record<string, number>>(
      (acc, record) => {
        acc[record.domain] = (acc[record.domain] ?? 0) + 1;
        return acc;
      },
      {}
    );
    const bySector = planningItems.reduce<
      ExecutiveReport["bySector"]
    >((acc, item) => {
      const bucket = acc[item.sector] ?? {
        planningItems: 0,
        queuedOrRunning: 0,
        blocked: 0
      };

      bucket.planningItems += 1;

      if (item.executionStatus === "queued" || item.executionStatus === "running") {
        bucket.queuedOrRunning += 1;
      }

      if (item.executionStatus === "blocked") {
        bucket.blocked += 1;
      }

      acc[item.sector] = bucket;
      return acc;
    }, {});
    const byProcessType = planningItems.reduce<
      ExecutiveReport["byProcessType"]
    >((acc, item) => {
      const bucket = acc[item.processType] ?? {
        planningItems: 0,
        pendingApprovals: 0
      };

      bucket.planningItems += 1;
      acc[item.processType] = bucket;
      return acc;
    }, {});
    const pendingApprovals = approvals.filter(
      (approval) => approval.status === "pending"
    ).length;
    const pendingHandoffs = handoffs.filter(
      (handoff) =>
        handoff.status === "pending" ||
        handoff.status === "accepted" ||
        handoff.status === "running"
    ).length;
    const openValidations = planningItems.filter((item) => {
      if (!item.validationNeeded) {
        return false;
      }

      return !validations.some(
        (validation) =>
          validation.planningItemId === item.id && validation.status === "passed"
      );
    }).length;
    const workflowsRunning = workflowRuns.filter(
      (run) => run.status === "queued" || run.status === "running"
    ).length;
    const workflowsFailed = workflowRuns.filter(
      (run) => run.status === "failed" || run.status === "compensating"
    ).length;
    const capabilitiesByPhase = sectorCapabilities.reduce<Record<string, number>>(
      (acc, capability) => {
        acc[capability.phase] = (acc[capability.phase] ?? 0) + 1;
        return acc;
      },
      {}
    );
    const missingData: string[] = [];

    if (missions.length === 0) {
      missingData.push("Nenhuma missao registrada no runtime.");
    }

    if (planningItems.length === 0) {
      missingData.push("Nenhum item de planejamento sincronizado ou bootstrapado.");
    }

    for (const domain of ["brand", "offers", "sales", "technology", "operations"]) {
      if (!memoryCoverage[domain]) {
        missingData.push(`Sem memoria registrada para o dominio ${domain}.`);
      }
    }

    const highlights = [
      `Missoes ativas: ${missions.filter((mission) => mission.status !== "archived").length}.`,
      `Itens de planejamento: ${planningItems.length} com ${pendingHandoffs} handoffs pendentes e ${pendingApprovals} approvals abertos.`,
      `Workflow history: ${workflowRuns.length} runs, ${workflowsRunning} em andamento e ${workflowsFailed} com falha ou compensacao.`
    ];
    const risks: string[] = [];

    if (pendingApprovals > 0) {
      risks.push(`Existem ${pendingApprovals} approvals pendentes de decisao.`);
    }

    if (openValidations > 0) {
      risks.push(`Existem ${openValidations} itens aguardando validacao conclusiva.`);
    }

    if (workflowsFailed > 0) {
      risks.push(`Existem ${workflowsFailed} workflow runs com falha ou compensacao.`);
    }

    if (optimizationInitiatives.length === 0) {
      missingData.push("Nenhuma iniciativa de otimizacao registrada.");
    }

    if (onboardingRecords.length === 0) {
      missingData.push("Nenhum onboarding estruturado registrado para expansao.");
    }

    for (const approval of approvals) {
      if (approval.status !== "pending") {
        continue;
      }

      const planningItem = planningItems.find(
        (item) => item.id === approval.planningItemId
      );

      if (planningItem) {
        byProcessType[planningItem.processType] ??= {
          planningItems: 0,
          pendingApprovals: 0
        };
        byProcessType[planningItem.processType].pendingApprovals += 1;
      }
    }

    return executiveReportSchema.parse({
      generatedAt: new Date().toISOString(),
      summary:
        "Relatorio executivo do runtime GMV consolidando estado operacional, risco e cobertura de memoria.",
      highlights,
      risks,
      missingData,
      metrics: {
        missionsTotal: missions.length,
        planningItemsTotal: planningItems.length,
        handoffsPending: pendingHandoffs,
        approvalsPending: pendingApprovals,
        validationsOpen: openValidations,
        workflowsRunning,
        workflowsFailed,
        memoryRecordsTotal: memoryRecords.length
      },
      optimization: {
        total: optimizationInitiatives.length,
        active: optimizationInitiatives.filter((item) => item.status === "active").length,
        reviewing: optimizationInitiatives.filter((item) => item.status === "reviewing").length,
        adopted: optimizationInitiatives.filter((item) => item.status === "adopted").length
      },
      expansion: {
        sectorsCovered: new Set(sectorCapabilities.map((item) => item.sector)).size,
        capabilitiesByPhase,
        onboardingPlanned: onboardingRecords.filter(
          (record) => record.status !== "completed"
        ).length
      },
      bySector,
      byProcessType,
      memoryCoverage
    });
  }
}

export function createAuditEvent(
  aggregateType: string,
  aggregateId: string,
  eventType: string,
  actorId: string | null,
  correlationId: string,
  payload: Record<string, unknown>
): AuditEvent {
  return auditEventSchema.parse({
    id: randomUUID(),
    aggregateType,
    aggregateId,
    eventType,
    actorId,
    correlationId,
    payload,
    createdAt: new Date().toISOString()
  });
}

function latestByTimestamp<T>(
  items: T[],
  getTimestamp: (item: T) => string | null | undefined
): T | undefined {
  return [...items].sort((left, right) => {
    const leftTimestamp = getTimestamp(left) ?? "";
    const rightTimestamp = getTimestamp(right) ?? "";
    return rightTimestamp.localeCompare(leftTimestamp);
  })[0];
}

function resolveValidationState(
  validationNeeded: boolean,
  validations: ValidationResult[]
): TaskDashboardItem["validationState"] {
  if (!validationNeeded) {
    return "not_required";
  }

  if (validations.some((validation) => validation.status === "failed")) {
    return "failed";
  }

  if (validations.some((validation) => validation.status === "warning")) {
    return "warning";
  }

  if (validations.some((validation) => validation.status === "passed")) {
    return "passed";
  }

  return "pending";
}

function getPriorityWeight(priority: TaskDashboardItem["priority"]): number {
  if (priority === "critical") {
    return 4;
  }

  if (priority === "high") {
    return 3;
  }

  if (priority === "medium") {
    return 2;
  }

  return 1;
}

function appendHandoffNote(
  existing: string,
  reason: string,
  note: string
): string {
  const segments = [existing.trim(), `Escalated: ${reason}.`, note.trim()].filter(
    Boolean
  );

  return segments.join(" ");
}
