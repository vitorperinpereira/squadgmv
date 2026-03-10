import { z } from "zod";

export const processTypes = [
  "strategic",
  "operational",
  "optimization",
  "governance"
] as const;

export const sectors = [
  "marketing",
  "sales",
  "technology",
  "brand",
  "quality",
  "operations",
  "support"
] as const;

export const priorities = ["low", "medium", "high", "critical"] as const;

export const planningKinds = ["project", "epic", "story", "task"] as const;

export const planningStatuses = [
  "backlog",
  "refining",
  "ready",
  "in_progress",
  "waiting_validation",
  "done",
  "cancelled"
] as const;

export const executionStatuses = [
  "not_started",
  "queued",
  "running",
  "blocked",
  "completed",
  "failed"
] as const;

export const missionStatuses = [
  "draft",
  "accepted",
  "projected",
  "in_execution",
  "blocked",
  "completed",
  "archived"
] as const;

export const handoffStatuses = [
  "pending",
  "accepted",
  "running",
  "completed",
  "rejected",
  "escalated",
  "expired",
  "failed"
] as const;

export const approvalStatuses = [
  "pending",
  "approved",
  "rejected",
  "superseded"
] as const;

export const validationStatuses = ["passed", "failed", "warning"] as const;
export const workflowRunStatuses = [
  "queued",
  "running",
  "succeeded",
  "failed",
  "compensating",
  "cancelled"
] as const;

export const actorTypes = [
  "founder",
  "ceo",
  "c_level",
  "specialist",
  "worker",
  "human_operator",
  "system"
] as const;

export const businessFlowKeys = [
  "marketing",
  "sales",
  "technology"
] as const;

export const agentPhases = ["mvp", "phase_2", "phase_3"] as const;

export const memoryDomains = [
  "brand",
  "offers",
  "sales",
  "technology",
  "operations",
  "quality"
] as const;

export const optimizationStatuses = [
  "proposed",
  "active",
  "reviewing",
  "adopted",
  "reverted",
  "iterating"
] as const;

export const optimizationDecisions = [
  "pending",
  "adopt",
  "revert",
  "iterate"
] as const;

export const optimizationSourceTypes = [
  "metric",
  "validation",
  "report",
  "memory"
] as const;

export const expansionStatuses = ["planned", "active", "paused"] as const;

export const onboardingStatuses = ["planned", "ready", "completed"] as const;
export const governanceGateStages = ["validation", "approval"] as const;
export const governanceScopes = ["project", "task"] as const;
export const escalationLevels = [
  "to_c_level",
  "to_ceo",
  "to_founder"
] as const;
export const escalationStatuses = ["open", "resolved"] as const;

export const processTypeSchema = z.enum(processTypes);
export const sectorSchema = z.string().min(2);
export const prioritySchema = z.enum(priorities);
export const planningKindSchema = z.enum(planningKinds);
export const planningStatusSchema = z.enum(planningStatuses);
export const executionStatusSchema = z.enum(executionStatuses);
export const missionStatusSchema = z.enum(missionStatuses);
export const handoffStatusSchema = z.enum(handoffStatuses);
export const approvalStatusSchema = z.enum(approvalStatuses);
export const validationStatusSchema = z.enum(validationStatuses);
export const workflowRunStatusSchema = z.enum(workflowRunStatuses);
export const actorTypeSchema = z.enum(actorTypes);
export const businessFlowKeySchema = z.enum(businessFlowKeys);
export const agentPhaseSchema = z.enum(agentPhases);
export const memoryDomainSchema = z.enum(memoryDomains);
export const optimizationStatusSchema = z.enum(optimizationStatuses);
export const optimizationDecisionSchema = z.enum(optimizationDecisions);
export const optimizationSourceTypeSchema = z.enum(optimizationSourceTypes);
export const expansionStatusSchema = z.enum(expansionStatuses);
export const onboardingStatusSchema = z.enum(onboardingStatuses);
export const governanceGateStageSchema = z.enum(governanceGateStages);
export const governanceScopeSchema = z.enum(governanceScopes);
export const escalationLevelSchema = z.enum(escalationLevels);
export const escalationStatusSchema = z.enum(escalationStatuses);

export const missionCreateInputSchema = z.object({
  title: z.string().min(3),
  objective: z.string().min(10),
  context: z.record(z.string(), z.unknown()).default({}),
  priority: prioritySchema.default("high"),
  process_type: processTypeSchema.default("strategic"),
  initiator_slug: z.string().default("vitor-perin"),
  owner_agent_slug: z.string().default("openclaw"),
  success_criteria: z.array(z.string()).default([])
});

export const missionSchema = z.object({
  id: z.string(),
  title: z.string(),
  objective: z.string(),
  context: z.record(z.string(), z.unknown()),
  priority: prioritySchema,
  status: missionStatusSchema,
  processType: processTypeSchema,
  initiatorId: z.string(),
  ownerAgentId: z.string(),
  successCriteria: z.array(z.string()),
  notionProjectPageId: z.string().optional(),
  notionProjectUrl: z.string().optional(),
  correlationId: z.string(),
  createdAt: z.string(),
  updatedAt: z.string()
});

export const planningItemSchema = z.object({
  id: z.string(),
  missionId: z.string(),
  parentId: z.string().nullable().optional(),
  notionPageId: z.string().optional(),
  kind: planningKindSchema,
  title: z.string(),
  description: z.string().default(""),
  sector: sectorSchema,
  priority: prioritySchema,
  processType: processTypeSchema,
  planningStatus: planningStatusSchema,
  executionStatus: executionStatusSchema,
  ownerAgentId: z.string().nullable().optional(),
  externalUrl: z.string().optional(),
  contextSummary: z.string().default(""),
  acceptanceCriteria: z.array(z.string()).default([]),
  dependencies: z.array(z.string()).default([]),
  inputSummary: z.string().default(""),
  expectedOutput: z.string().default(""),
  validationNeeded: z.boolean().default(false),
  createdAt: z.string(),
  updatedAt: z.string()
});

export const notionPlanningSnapshotSchema = z.object({
  items: z.array(planningItemSchema)
});

export const handoffCreateInputSchema = z.object({
  task_id: z.string(),
  origin_agent: z.string(),
  target_agent: z.string(),
  task_type: z.string().min(2),
  priority: prioritySchema,
  context: z.record(z.string(), z.unknown()).default({}),
  input: z.record(z.string(), z.unknown()).default({}),
  expected_output: z.union([
    z.string(),
    z.record(z.string(), z.unknown())
  ]),
  deadline: z.string().nullable().optional(),
  validation_rules: z.array(z.string()).default([])
});

export const handoffResponseInputSchema = z.object({
  status: z.enum(["completed", "rejected", "failed", "needs_changes"]),
  result: z.record(z.string(), z.unknown()).default({}),
  confidence: z.number().min(0).max(1).default(0.75),
  notes: z.string().default(""),
  needs_validation: z.boolean().default(false)
});

export const handoffSchema = z.object({
  id: z.string(),
  taskId: z.string(),
  originAgentId: z.string(),
  targetAgentId: z.string(),
  taskType: z.string(),
  priority: prioritySchema,
  context: z.record(z.string(), z.unknown()),
  input: z.record(z.string(), z.unknown()),
  expectedOutput: z.union([
    z.string(),
    z.record(z.string(), z.unknown())
  ]),
  deadline: z.string().nullable().optional(),
  validationRules: z.array(z.string()),
  status: handoffStatusSchema,
  result: z.record(z.string(), z.unknown()).default({}),
  confidence: z.number().min(0).max(1).nullable().optional(),
  notes: z.string().default(""),
  needsValidation: z.boolean(),
  createdAt: z.string(),
  updatedAt: z.string()
});

export const approvalDecisionSchema = z.object({
  id: z.string(),
  planningItemId: z.string(),
  requestedByAgentId: z.string(),
  approverAgentId: z.string(),
  approvalType: z.string(),
  status: approvalStatusSchema,
  decisionNotes: z.string().default(""),
  decidedAt: z.string().nullable().optional(),
  createdAt: z.string()
});

export const approvalDecisionInputSchema = z.object({
  status: z.enum(["approved", "rejected"]),
  decision_notes: z.string().default("")
});

export const approvalCreateInputSchema = z.object({
  planning_item_id: z.string(),
  requested_by_agent: z.string(),
  approver_agent: z.string(),
  approval_type: z.string().min(2)
});

export const validationResultSchema = z.object({
  id: z.string(),
  planningItemId: z.string(),
  validatorAgentId: z.string(),
  validationType: z.string(),
  status: validationStatusSchema,
  findings: z.array(z.string()),
  validatedAt: z.string()
});

export const validationResultInputSchema = z.object({
  planning_item_id: z.string(),
  validator_agent: z.string(),
  validation_type: z.string().min(2),
  status: validationStatusSchema,
  findings: z.array(z.string()).default([])
});

export const workflowRunSchema = z.object({
  id: z.string(),
  planningItemId: z.string().nullable().optional(),
  handoffId: z.string().nullable().optional(),
  queueJobId: z.string().nullable().optional(),
  jobName: z.string(),
  attempt: z.number().int().positive(),
  status: workflowRunStatusSchema,
  correlationId: z.string(),
  errorSummary: z.string().nullable().optional(),
  startedAt: z.string().nullable().optional(),
  finishedAt: z.string().nullable().optional(),
  createdAt: z.string()
});

export const memoryRecordSchema = z.object({
  id: z.string(),
  domain: memoryDomainSchema,
  title: z.string(),
  summary: z.string(),
  bodyRef: z.string(),
  tags: z.array(z.string()),
  sourceType: z.enum(["delivery", "decision", "playbook", "postmortem", "asset"]),
  linkedPlanningItemId: z.string().nullable().optional(),
  linkedMissionId: z.string().nullable().optional(),
  createdAt: z.string()
});

export const memoryCaptureInputSchema = z.object({
  domain: memoryDomainSchema,
  title: z.string().min(3),
  summary: z.string().min(10),
  body_ref: z.string().min(1),
  tags: z.array(z.string()).default([]),
  source_type: z.enum(["delivery", "decision", "playbook", "postmortem", "asset"]),
  linked_planning_item_id: z.string().nullable().optional(),
  linked_mission_id: z.string().nullable().optional()
});

export const auditEventSchema = z.object({
  id: z.string(),
  aggregateType: z.string(),
  aggregateId: z.string(),
  eventType: z.string(),
  actorId: z.string().nullable().optional(),
  correlationId: z.string(),
  payload: z.record(z.string(), z.unknown()),
  createdAt: z.string()
});

export const agentProfileSchema = z.object({
  id: z.string(),
  name: z.string(),
  slug: z.string(),
  actorType: actorTypeSchema,
  sector: sectorSchema,
  phase: agentPhaseSchema,
  status: z.enum(["active", "paused", "disabled"]),
  roles: z.array(z.string()),
  createdAt: z.string()
});

export const optimizationInitiativeSchema = z.object({
  id: z.string(),
  title: z.string(),
  sector: sectorSchema,
  flowKey: businessFlowKeySchema.nullable().optional(),
  sourceType: optimizationSourceTypeSchema,
  sourceRef: z.string(),
  hypothesis: z.string(),
  ownerAgentId: z.string(),
  linkedMissionId: z.string().nullable().optional(),
  linkedPlanningItemId: z.string().nullable().optional(),
  linkedValidationId: z.string().nullable().optional(),
  successCriteria: z.array(z.string()),
  testStart: z.string(),
  testEnd: z.string(),
  status: optimizationStatusSchema,
  decision: optimizationDecisionSchema,
  resultSummary: z.string().default(""),
  learnings: z.array(z.string()).default([]),
  createdAt: z.string(),
  updatedAt: z.string()
});

export const optimizationCreateInputSchema = z.object({
  title: z.string().min(3),
  sector: sectorSchema,
  flow_key: businessFlowKeySchema.optional(),
  source_type: optimizationSourceTypeSchema,
  source_ref: z.string().min(1),
  hypothesis: z.string().min(10),
  owner_agent: z.string(),
  linked_mission_id: z.string().nullable().optional(),
  linked_planning_item_id: z.string().nullable().optional(),
  linked_validation_id: z.string().nullable().optional(),
  success_criteria: z.array(z.string()).min(1),
  test_start: z.string(),
  test_end: z.string()
});

export const optimizationDecisionInputSchema = z.object({
  status: z.enum(["reviewing", "adopted", "reverted", "iterating"]),
  decision: z.enum(["adopt", "revert", "iterate"]),
  result_summary: z.string().default(""),
  learnings: z.array(z.string()).default([])
});

export const sectorCapabilitySchema = z.object({
  id: z.string(),
  sector: sectorSchema,
  capability: z.string(),
  phase: agentPhaseSchema,
  status: expansionStatusSchema,
  workflowKeys: z.array(z.string()),
  memoryDomains: z.array(memoryDomainSchema),
  ownerAgentId: z.string().nullable().optional(),
  createdAt: z.string(),
  updatedAt: z.string()
});

export const sectorCapabilityCreateInputSchema = z.object({
  sector: sectorSchema,
  capability: z.string().min(3),
  phase: agentPhaseSchema,
  status: expansionStatusSchema.default("planned"),
  workflow_keys: z.array(z.string()).default([]),
  memory_domains: z.array(memoryDomainSchema).default([]),
  owner_agent: z.string().optional()
});

export const agentOnboardingSchema = z.object({
  id: z.string(),
  agentId: z.string(),
  agentName: z.string(),
  agentSlug: z.string(),
  actorType: actorTypeSchema,
  sector: sectorSchema,
  targetPhase: agentPhaseSchema,
  status: onboardingStatusSchema,
  workflowKeys: z.array(z.string()),
  requiredMemoryDomains: z.array(memoryDomainSchema),
  checklist: z.array(z.string()),
  linkedCapabilityId: z.string().nullable().optional(),
  createdAt: z.string(),
  updatedAt: z.string()
});

export const agentOnboardingCreateInputSchema = z.object({
  agent_name: z.string().min(3),
  agent_slug: z.string().min(3),
  actor_type: actorTypeSchema,
  sector: sectorSchema,
  target_phase: agentPhaseSchema,
  roles: z.array(z.string()).default([]),
  workflow_keys: z.array(z.string()).default([]),
  required_memory_domains: z.array(memoryDomainSchema).default([]),
  checklist: z.array(z.string()).default([]),
  linked_capability_id: z.string().nullable().optional()
});

export const governanceGatePolicySchema = z.object({
  id: z.string(),
  key: z.string(),
  flowKey: businessFlowKeySchema,
  stage: governanceGateStageSchema,
  scope: governanceScopeSchema,
  taskSlug: z.string().nullable().optional(),
  sector: sectorSchema,
  active: z.boolean(),
  validatorSlug: z.string().nullable().optional(),
  validationType: z.string().nullable().optional(),
  initialValidationStatus: validationStatusSchema.nullable().optional(),
  findingsTemplate: z.array(z.string()).default([]),
  requestedBySlug: z.string().nullable().optional(),
  approverSlug: z.string().nullable().optional(),
  approvalType: z.string().nullable().optional(),
  decisionNotesTemplate: z.string().default(""),
  createdAt: z.string(),
  updatedAt: z.string()
});

export const governanceGatePolicyCreateInputSchema = z.object({
  key: z.string().min(3),
  flow_key: businessFlowKeySchema,
  stage: governanceGateStageSchema,
  scope: governanceScopeSchema.default("task"),
  task_slug: z.string().nullable().optional(),
  sector: sectorSchema,
  active: z.boolean().default(true),
  validator_slug: z.string().nullable().optional(),
  validation_type: z.string().nullable().optional(),
  initial_validation_status: validationStatusSchema.nullable().optional(),
  findings_template: z.array(z.string()).default([]),
  requested_by_slug: z.string().nullable().optional(),
  approver_slug: z.string().nullable().optional(),
  approval_type: z.string().nullable().optional(),
  decision_notes_template: z.string().default("")
});

export const escalationRecordSchema = z.object({
  id: z.string(),
  handoffId: z.string(),
  replacementHandoffId: z.string(),
  fromAgentId: z.string(),
  toAgentId: z.string(),
  level: escalationLevelSchema,
  reason: z.string(),
  note: z.string().default(""),
  status: escalationStatusSchema,
  createdAt: z.string(),
  resolvedAt: z.string().nullable().optional()
});

export const handoffEscalationInputSchema = z.object({
  reason: z.string().min(5),
  note: z.string().default(""),
  force_target: z.string().optional()
});

export const executiveBoardSchema = z.object({
  missions: z.object({
    total: z.number(),
    byStatus: z.record(z.string(), z.number())
  }),
  handoffs: z.object({
    total: z.number(),
    pending: z.number(),
    needsValidation: z.number()
  }),
  approvals: z.object({
    pending: z.number(),
    total: z.number()
  }),
  planning: z.object({
    bySector: z.record(
      z.string(),
      z.object({
        ready: z.number(),
        inProgress: z.number(),
        blocked: z.number()
      })
    )
  })
});

export const flowBootstrapResultSchema = z.object({
  missionId: z.string(),
  flow: businessFlowKeySchema,
  projectId: z.string(),
  counts: z.object({
    planningItems: z.number(),
    handoffs: z.number(),
    approvals: z.number(),
    validations: z.number()
  }),
  planningItems: z.array(planningItemSchema),
  handoffs: z.array(handoffSchema),
  approvals: z.array(approvalDecisionSchema),
  validations: z.array(validationResultSchema)
});

export const sectorBoardSchema = z.object({
  sectors: z.record(
    z.string(),
    z.object({
      planningItems: z.number(),
      readyItems: z.number(),
      inProgressItems: z.number(),
      blockedItems: z.number(),
      completedItems: z.number(),
      handoffsIn: z.number(),
      handoffsOut: z.number(),
      pendingApprovals: z.number(),
      pendingValidations: z.number()
    })
  )
});

export const executiveReportSchema = z.object({
  generatedAt: z.string(),
  summary: z.string(),
  highlights: z.array(z.string()),
  risks: z.array(z.string()),
  missingData: z.array(z.string()),
  metrics: z.object({
    missionsTotal: z.number(),
    planningItemsTotal: z.number(),
    handoffsPending: z.number(),
    approvalsPending: z.number(),
    validationsOpen: z.number(),
    workflowsRunning: z.number(),
    workflowsFailed: z.number(),
    memoryRecordsTotal: z.number()
  }),
  optimization: z.object({
    total: z.number(),
    active: z.number(),
    reviewing: z.number(),
    adopted: z.number()
  }),
  expansion: z.object({
    sectorsCovered: z.number(),
    capabilitiesByPhase: z.record(z.string(), z.number()),
    onboardingPlanned: z.number()
  }),
  bySector: z.record(
    z.string(),
    z.object({
      planningItems: z.number(),
      queuedOrRunning: z.number(),
      blocked: z.number()
    })
  ),
  byProcessType: z.record(
    z.string(),
    z.object({
      planningItems: z.number(),
      pendingApprovals: z.number()
    })
  ),
  memoryCoverage: z.record(z.string(), z.number())
});

export const taskDashboardItemSchema = z.object({
  id: z.string(),
  title: z.string(),
  missionId: z.string(),
  missionTitle: z.string(),
  sector: sectorSchema,
  priority: prioritySchema,
  processType: processTypeSchema,
  planningStatus: planningStatusSchema,
  executionStatus: executionStatusSchema,
  ownerAgentId: z.string().nullable().optional(),
  ownerAgentName: z.string(),
  ownerAgentSlug: z.string().nullable().optional(),
  validationNeeded: z.boolean(),
  validationState: z.enum(["not_required", "pending", "passed", "failed", "warning"]),
  pendingApprovals: z.number().int().nonnegative(),
  openHandoffs: z.number().int().nonnegative(),
  externalUrl: z.string().optional(),
  updatedAt: z.string()
});

export const taskDashboardResponseSchema = z.object({
  generatedAt: z.string(),
  summary: z.object({
    total: z.number().int().nonnegative(),
    ready: z.number().int().nonnegative(),
    queued: z.number().int().nonnegative(),
    running: z.number().int().nonnegative(),
    blocked: z.number().int().nonnegative(),
    waitingValidation: z.number().int().nonnegative(),
    completed: z.number().int().nonnegative(),
    unassigned: z.number().int().nonnegative()
  }),
  items: z.array(taskDashboardItemSchema)
});

export type MissionCreateInput = z.infer<typeof missionCreateInputSchema>;
export type Mission = z.infer<typeof missionSchema>;
export type PlanningItem = z.infer<typeof planningItemSchema>;
export type Handoff = z.infer<typeof handoffSchema>;
export type HandoffCreateInput = z.infer<typeof handoffCreateInputSchema>;
export type HandoffResponseInput = z.infer<typeof handoffResponseInputSchema>;
export type AgentProfile = z.infer<typeof agentProfileSchema>;
export type ApprovalDecision = z.infer<typeof approvalDecisionSchema>;
export type ApprovalDecisionInput = z.infer<typeof approvalDecisionInputSchema>;
export type ApprovalCreateInput = z.infer<typeof approvalCreateInputSchema>;
export type ValidationResult = z.infer<typeof validationResultSchema>;
export type ValidationResultInput = z.infer<typeof validationResultInputSchema>;
export type WorkflowRun = z.infer<typeof workflowRunSchema>;
export type MemoryRecord = z.infer<typeof memoryRecordSchema>;
export type MemoryCaptureInput = z.infer<typeof memoryCaptureInputSchema>;
export type OptimizationInitiative = z.infer<typeof optimizationInitiativeSchema>;
export type OptimizationCreateInput = z.infer<typeof optimizationCreateInputSchema>;
export type OptimizationDecisionInput = z.infer<typeof optimizationDecisionInputSchema>;
export type SectorCapability = z.infer<typeof sectorCapabilitySchema>;
export type SectorCapabilityCreateInput = z.infer<typeof sectorCapabilityCreateInputSchema>;
export type AgentOnboarding = z.infer<typeof agentOnboardingSchema>;
export type AgentOnboardingCreateInput = z.infer<typeof agentOnboardingCreateInputSchema>;
export type GovernanceGatePolicy = z.infer<typeof governanceGatePolicySchema>;
export type GovernanceGatePolicyCreateInput = z.infer<typeof governanceGatePolicyCreateInputSchema>;
export type EscalationRecord = z.infer<typeof escalationRecordSchema>;
export type HandoffEscalationInput = z.infer<typeof handoffEscalationInputSchema>;
export type AuditEvent = z.infer<typeof auditEventSchema>;
export type ExecutiveBoard = z.infer<typeof executiveBoardSchema>;
export type NotionPlanningSnapshot = z.infer<typeof notionPlanningSnapshotSchema>;
export type BusinessFlowKey = z.infer<typeof businessFlowKeySchema>;
export type FlowBootstrapResult = z.infer<typeof flowBootstrapResultSchema>;
export type SectorBoard = z.infer<typeof sectorBoardSchema>;
export type ExecutiveReport = z.infer<typeof executiveReportSchema>;
export type TaskDashboardItem = z.infer<typeof taskDashboardItemSchema>;
export type TaskDashboardResponse = z.infer<typeof taskDashboardResponseSchema>;
