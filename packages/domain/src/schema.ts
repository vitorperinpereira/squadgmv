import {
  boolean,
  integer,
  jsonb,
  numeric,
  pgEnum,
  pgTable,
  text,
  timestamp,
  uuid
} from "drizzle-orm/pg-core";

export const processTypeEnum = pgEnum("process_type", [
  "strategic",
  "operational",
  "optimization",
  "governance"
]);

export const missionStatusEnum = pgEnum("mission_status", [
  "draft",
  "accepted",
  "projected",
  "in_execution",
  "blocked",
  "completed",
  "archived"
]);

export const planningKindEnum = pgEnum("planning_kind", [
  "project",
  "epic",
  "story",
  "task"
]);

export const planningStatusEnum = pgEnum("planning_status", [
  "backlog",
  "refining",
  "ready",
  "in_progress",
  "waiting_validation",
  "done",
  "cancelled"
]);

export const executionStatusEnum = pgEnum("execution_status", [
  "not_started",
  "queued",
  "running",
  "blocked",
  "completed",
  "failed"
]);

export const handoffStatusEnum = pgEnum("handoff_status", [
  "pending",
  "accepted",
  "running",
  "completed",
  "rejected",
  "escalated",
  "expired",
  "failed"
]);

export const approvalStatusEnum = pgEnum("approval_status", [
  "pending",
  "approved",
  "rejected",
  "superseded"
]);

export const validationStatusEnum = pgEnum("validation_status", [
  "passed",
  "failed",
  "warning"
]);

export const workflowStatusEnum = pgEnum("workflow_status", [
  "queued",
  "running",
  "succeeded",
  "failed",
  "compensating",
  "cancelled"
]);

export const optimizationStatusEnum = pgEnum("optimization_status", [
  "proposed",
  "active",
  "reviewing",
  "adopted",
  "reverted",
  "iterating"
]);

export const optimizationDecisionEnum = pgEnum("optimization_decision", [
  "pending",
  "adopt",
  "revert",
  "iterate"
]);

export const expansionStatusEnum = pgEnum("expansion_status", [
  "planned",
  "active",
  "paused"
]);

export const onboardingStatusEnum = pgEnum("onboarding_status", [
  "planned",
  "ready",
  "completed"
]);

export const governanceGateStageEnum = pgEnum("governance_gate_stage", [
  "validation",
  "approval"
]);

export const governanceScopeEnum = pgEnum("governance_scope", [
  "project",
  "task"
]);

export const escalationLevelEnum = pgEnum("escalation_level", [
  "to_c_level",
  "to_ceo",
  "to_founder"
]);

export const escalationStatusEnum = pgEnum("escalation_status", [
  "open",
  "resolved"
]);

export const agentProfiles = pgTable("agent_profiles", {
  id: uuid("id").primaryKey(),
  name: text("name").notNull(),
  slug: text("slug").notNull().unique(),
  actorType: text("actor_type").notNull(),
  sector: text("sector").notNull(),
  phase: text("phase").notNull(),
  status: text("status").notNull(),
  roles: jsonb("roles").$type<string[]>().notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull()
});

export const missions = pgTable("missions", {
  id: uuid("id").primaryKey(),
  title: text("title").notNull(),
  objective: text("objective").notNull(),
  context: jsonb("context").$type<Record<string, unknown>>().notNull(),
  priority: text("priority").notNull(),
  status: missionStatusEnum("status").notNull(),
  processType: processTypeEnum("process_type").notNull(),
  initiatorId: uuid("initiator_id").notNull(),
  ownerAgentId: uuid("owner_agent_id").notNull(),
  successCriteria: jsonb("success_criteria").$type<string[]>().notNull(),
  notionProjectPageId: text("notion_project_page_id"),
  notionProjectUrl: text("notion_project_url"),
  correlationId: text("correlation_id").notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull()
});

export const planningItems = pgTable("planning_items", {
  id: uuid("id").primaryKey(),
  missionId: uuid("mission_id").notNull(),
  parentId: uuid("parent_id"),
  notionPageId: text("notion_page_id"),
  kind: planningKindEnum("kind").notNull(),
  title: text("title").notNull(),
  description: text("description").notNull(),
  sector: text("sector").notNull(),
  priority: text("priority").notNull(),
  processType: processTypeEnum("process_type").notNull(),
  planningStatus: planningStatusEnum("planning_status").notNull(),
  executionStatus: executionStatusEnum("execution_status").notNull(),
  ownerAgentId: uuid("owner_agent_id"),
  externalUrl: text("external_url"),
  contextSummary: text("context_summary").notNull(),
  acceptanceCriteria: jsonb("acceptance_criteria").$type<string[]>().notNull(),
  dependencies: jsonb("dependencies").$type<string[]>().notNull(),
  inputSummary: text("input_summary").notNull(),
  expectedOutput: text("expected_output").notNull(),
  validationNeeded: boolean("validation_needed").notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull()
});

export const handoffs = pgTable("handoffs", {
  id: uuid("id").primaryKey(),
  taskId: uuid("task_id").notNull(),
  originAgentId: uuid("origin_agent_id").notNull(),
  targetAgentId: uuid("target_agent_id").notNull(),
  taskType: text("task_type").notNull(),
  priority: text("priority").notNull(),
  context: jsonb("context").$type<Record<string, unknown>>().notNull(),
  input: jsonb("input").$type<Record<string, unknown>>().notNull(),
  expectedOutput: jsonb("expected_output").$type<Record<string, unknown> | string>().notNull(),
  deadline: text("deadline"),
  validationRules: jsonb("validation_rules").$type<string[]>().notNull(),
  status: handoffStatusEnum("status").notNull(),
  result: jsonb("result").$type<Record<string, unknown>>().notNull(),
  confidence: numeric("confidence", { precision: 3, scale: 2 }),
  notes: text("notes").notNull(),
  needsValidation: boolean("needs_validation").notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull()
});

export const approvalDecisions = pgTable("approval_decisions", {
  id: uuid("id").primaryKey(),
  planningItemId: uuid("planning_item_id").notNull(),
  requestedByAgentId: uuid("requested_by_agent_id").notNull(),
  approverAgentId: uuid("approver_agent_id").notNull(),
  approvalType: text("approval_type").notNull(),
  status: approvalStatusEnum("status").notNull(),
  decisionNotes: text("decision_notes").notNull(),
  decidedAt: timestamp("decided_at", { withTimezone: true }),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull()
});

export const validationResults = pgTable("validation_results", {
  id: uuid("id").primaryKey(),
  planningItemId: uuid("planning_item_id").notNull(),
  validatorAgentId: uuid("validator_agent_id").notNull(),
  validationType: text("validation_type").notNull(),
  status: validationStatusEnum("status").notNull(),
  findings: jsonb("findings").$type<string[]>().notNull(),
  validatedAt: timestamp("validated_at", { withTimezone: true }).notNull()
});

export const workflowRuns = pgTable("workflow_runs", {
  id: uuid("id").primaryKey(),
  planningItemId: uuid("planning_item_id"),
  handoffId: uuid("handoff_id"),
  queueJobId: text("queue_job_id"),
  jobName: text("job_name").notNull(),
  attempt: integer("attempt").notNull(),
  status: workflowStatusEnum("status").notNull(),
  correlationId: text("correlation_id").notNull(),
  errorSummary: text("error_summary"),
  startedAt: timestamp("started_at", { withTimezone: true }),
  finishedAt: timestamp("finished_at", { withTimezone: true }),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull()
});

export const memoryRecords = pgTable("memory_records", {
  id: uuid("id").primaryKey(),
  domain: text("domain").notNull(),
  title: text("title").notNull(),
  summary: text("summary").notNull(),
  bodyRef: text("body_ref").notNull(),
  tags: jsonb("tags").$type<string[]>().notNull(),
  sourceType: text("source_type").notNull(),
  linkedPlanningItemId: uuid("linked_planning_item_id"),
  linkedMissionId: uuid("linked_mission_id"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull()
});

export const optimizationInitiatives = pgTable("optimization_initiatives", {
  id: uuid("id").primaryKey(),
  title: text("title").notNull(),
  sector: text("sector").notNull(),
  flowKey: text("flow_key"),
  sourceType: text("source_type").notNull(),
  sourceRef: text("source_ref").notNull(),
  hypothesis: text("hypothesis").notNull(),
  ownerAgentId: uuid("owner_agent_id").notNull(),
  linkedMissionId: uuid("linked_mission_id"),
  linkedPlanningItemId: uuid("linked_planning_item_id"),
  linkedValidationId: uuid("linked_validation_id"),
  successCriteria: jsonb("success_criteria").$type<string[]>().notNull(),
  testStart: timestamp("test_start", { withTimezone: true }).notNull(),
  testEnd: timestamp("test_end", { withTimezone: true }).notNull(),
  status: optimizationStatusEnum("status").notNull(),
  decision: optimizationDecisionEnum("decision").notNull(),
  resultSummary: text("result_summary").notNull(),
  learnings: jsonb("learnings").$type<string[]>().notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull()
});

export const sectorCapabilities = pgTable("sector_capabilities", {
  id: uuid("id").primaryKey(),
  sector: text("sector").notNull(),
  capability: text("capability").notNull(),
  phase: text("phase").notNull(),
  status: expansionStatusEnum("status").notNull(),
  workflowKeys: jsonb("workflow_keys").$type<string[]>().notNull(),
  memoryDomains: jsonb("memory_domains").$type<string[]>().notNull(),
  ownerAgentId: uuid("owner_agent_id"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull()
});

export const agentOnboarding = pgTable("agent_onboarding", {
  id: uuid("id").primaryKey(),
  agentId: uuid("agent_id").notNull(),
  agentName: text("agent_name").notNull(),
  agentSlug: text("agent_slug").notNull(),
  actorType: text("actor_type").notNull(),
  sector: text("sector").notNull(),
  targetPhase: text("target_phase").notNull(),
  status: onboardingStatusEnum("status").notNull(),
  workflowKeys: jsonb("workflow_keys").$type<string[]>().notNull(),
  requiredMemoryDomains: jsonb("required_memory_domains").$type<string[]>().notNull(),
  checklist: jsonb("checklist").$type<string[]>().notNull(),
  linkedCapabilityId: uuid("linked_capability_id"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull()
});

export const governanceGatePolicies = pgTable("governance_gate_policies", {
  id: uuid("id").primaryKey(),
  key: text("key").notNull().unique(),
  flowKey: text("flow_key").notNull(),
  stage: governanceGateStageEnum("stage").notNull(),
  scope: governanceScopeEnum("scope").notNull(),
  taskSlug: text("task_slug"),
  sector: text("sector").notNull(),
  active: boolean("active").notNull(),
  validatorSlug: text("validator_slug"),
  validationType: text("validation_type"),
  initialValidationStatus: validationStatusEnum("initial_validation_status"),
  findingsTemplate: jsonb("findings_template").$type<string[]>().notNull(),
  requestedBySlug: text("requested_by_slug"),
  approverSlug: text("approver_slug"),
  approvalType: text("approval_type"),
  decisionNotesTemplate: text("decision_notes_template").notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull()
});

export const escalationRecords = pgTable("escalation_records", {
  id: uuid("id").primaryKey(),
  handoffId: uuid("handoff_id").notNull(),
  replacementHandoffId: uuid("replacement_handoff_id").notNull(),
  fromAgentId: uuid("from_agent_id").notNull(),
  toAgentId: uuid("to_agent_id").notNull(),
  level: escalationLevelEnum("level").notNull(),
  reason: text("reason").notNull(),
  note: text("note").notNull(),
  status: escalationStatusEnum("status").notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull(),
  resolvedAt: timestamp("resolved_at", { withTimezone: true })
});

export const auditEvents = pgTable("audit_events", {
  id: uuid("id").primaryKey(),
  aggregateType: text("aggregate_type").notNull(),
  aggregateId: text("aggregate_id").notNull(),
  eventType: text("event_type").notNull(),
  actorId: uuid("actor_id"),
  correlationId: text("correlation_id").notNull(),
  payload: jsonb("payload").$type<Record<string, unknown>>().notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull()
});
