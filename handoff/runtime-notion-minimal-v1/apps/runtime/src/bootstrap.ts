import { randomUUID } from "node:crypto";
import { loadRuntimeConfig, type RuntimeConfig } from "@gmv/config";
import type {
  AgentOnboardingCreateInput,
  AgentProfile,
  ApprovalCreateInput,
  ApprovalDecisionInput,
  GovernanceGatePolicyCreateInput,
  HandoffCreateInput,
  HandoffEscalationInput,
  HandoffResponseInput,
  MemoryCaptureInput,
  MissionCreateInput,
  OptimizationCreateInput,
  OptimizationDecisionInput,
  SectorCapabilityCreateInput,
  ValidationResultInput
} from "@gmv/contracts";
import {
  agentOnboardingCreateInputSchema,
  approvalCreateInputSchema,
  approvalDecisionInputSchema,
  governanceGatePolicyCreateInputSchema,
  handoffCreateInputSchema,
  handoffEscalationInputSchema,
  handoffResponseInputSchema,
  memoryCaptureInputSchema,
  missionCreateInputSchema,
  optimizationCreateInputSchema,
  optimizationDecisionInputSchema,
  sectorCapabilityCreateInputSchema,
  validationResultInputSchema
} from "@gmv/contracts";
import {
  AgentDirectoryService,
  ApprovalService,
  BoardService,
  BusinessFlowService,
  EscalationService,
  ExpansionService,
  GovernancePolicyService,
  HandoffService,
  MissionService,
  OptimizationService,
  PlanningService,
  ReportingService,
  TaskBoardService,
  ValidationService,
  type RuntimeRepository,
  WorkflowService
} from "@gmv/domain";
import { MemoryService } from "@gmv/memory";
import {
  createPlanningSystemAdapter,
  DiskStoryMirror,
  type PlanningSystemAdapter
} from "@gmv/notion-adapter";
import { createLogger } from "@gmv/observability";
import { createQueueDriver, type QueueDriver } from "@gmv/queue";
import { FileRuntimeRepository } from "./infrastructure/file-runtime-repository.js";

export type RuntimeContext = {
  config: RuntimeConfig;
  logger: ReturnType<typeof createLogger>;
  repository: RuntimeRepository;
  queue: QueueDriver;
  planningAdapter: PlanningSystemAdapter;
  agentDirectoryService: AgentDirectoryService;
  missionService: MissionService;
  planningService: PlanningService;
  handoffService: HandoffService;
  approvalService: ApprovalService;
  governancePolicyService: GovernancePolicyService;
  escalationService: EscalationService;
  boardService: BoardService;
  businessFlowService: BusinessFlowService;
  workflowService: WorkflowService;
  optimizationService: OptimizationService;
  expansionService: ExpansionService;
  memoryService: MemoryService;
  reportingService: ReportingService;
  taskBoardService: TaskBoardService;
  validationService: ValidationService;
  close: () => Promise<void>;
  parseMissionInput: (input: unknown) => MissionCreateInput;
  parseHandoffCreateInput: (input: unknown) => HandoffCreateInput;
  parseHandoffResponseInput: (input: unknown) => HandoffResponseInput;
  parseHandoffEscalationInput: (input: unknown) => HandoffEscalationInput;
  parseApprovalCreateInput: (input: unknown) => ApprovalCreateInput;
  parseApprovalDecisionInput: (input: unknown) => ApprovalDecisionInput;
  parseGovernanceGatePolicyCreateInput: (
    input: unknown
  ) => GovernanceGatePolicyCreateInput;
  parseMemoryCaptureInput: (input: unknown) => MemoryCaptureInput;
  parseOptimizationCreateInput: (input: unknown) => OptimizationCreateInput;
  parseOptimizationDecisionInput: (input: unknown) => OptimizationDecisionInput;
  parseSectorCapabilityCreateInput: (input: unknown) => SectorCapabilityCreateInput;
  parseAgentOnboardingCreateInput: (input: unknown) => AgentOnboardingCreateInput;
  parseValidationResultInput: (input: unknown) => ValidationResultInput;
};

export type QueueProcessMode = "combined" | "producer" | "consumer";

export function resolveQueueProcessMode(
  config: RuntimeConfig,
  runtimeRole: "api" | "worker"
): QueueProcessMode {
  if (config.QUEUE_DRIVER !== "pg-boss") {
    return "combined";
  }

  if (config.STATE_DRIVER !== "postgres") {
    return "combined";
  }

  return runtimeRole === "api" ? "producer" : "consumer";
}

export function getQueueModeWarning(
  config: RuntimeConfig,
  runtimeRole: "api" | "worker"
): string | null {
  if (config.QUEUE_DRIVER !== "pg-boss" || config.STATE_DRIVER === "postgres") {
    return null;
  }

  return `QUEUE_DRIVER=pg-boss is running in combined mode for the ${runtimeRole} runtime because STATE_DRIVER=${config.STATE_DRIVER}. Producer/consumer split is only safe once the runtime state repository is backed by PostgreSQL.`;
}

export async function createRuntimeContext(options?: {
  config?: RuntimeConfig;
  repository?: RuntimeRepository;
  planningAdapter?: PlanningSystemAdapter;
  queueMode?: QueueProcessMode;
}): Promise<RuntimeContext> {
  const config = options?.config ?? loadRuntimeConfig();
  const queueMode = options?.queueMode ?? "combined";
  const consumersEnabled = queueMode !== "producer";
  const logger = createLogger({ name: "gmv-runtime" });
  const repository =
    options?.repository ?? new FileRuntimeRepository(config.GMV_STATE_FILE);

  if ("initialize" in repository && typeof repository.initialize === "function") {
    await repository.initialize();
  }

  await repository.seedAgents(createDefaultAgents());

  const planningAdapter =
    options?.planningAdapter ?? createPlanningSystemAdapter(config);
  const storyMirror = new DiskStoryMirror(config.STORY_MIRROR_DIR);
  const queue = createQueueDriver({
    driver: config.QUEUE_DRIVER,
    connectionString: config.DATABASE_URL
  });
  const missionService = new MissionService(repository, queue);
  const agentDirectoryService = new AgentDirectoryService(repository);
  const planningService = new PlanningService(
    repository,
    planningAdapter,
    storyMirror,
    queue
  );
  const handoffService = new HandoffService(repository);
  const approvalService = new ApprovalService(repository);
  const validationService = new ValidationService(repository);
  const governancePolicyService = new GovernancePolicyService(repository);
  const escalationService = new EscalationService(repository);
  const boardService = new BoardService(repository);
  const businessFlowService = new BusinessFlowService(repository);
  const workflowService = new WorkflowService(repository);
  const optimizationService = new OptimizationService(repository);
  const expansionService = new ExpansionService(repository);
  const memoryService = new MemoryService({
    save: (record) => repository.saveMemoryRecord(record),
    list: (filter) => repository.listMemoryRecords(filter)
  });
  const reportingService = new ReportingService(repository);
  const taskBoardService = new TaskBoardService(repository);

  await seedDefaultCapabilities(repository);
  await seedDefaultGovernancePolicies(repository);

  await queue.register<{ missionId: string; correlationId?: string }>(
    "mission.project-to-notion",
    consumersEnabled
      ? async (job) => {
          const startedAt = new Date().toISOString();
          const correlationId = extractCorrelationId(job.data);

          await workflowService.recordRun({
            id: randomUUID(),
            planningItemId: job.data.missionId,
            handoffId: null,
            queueJobId: job.id,
            jobName: job.name,
            attempt: job.attempt,
            status: "running",
            correlationId,
            errorSummary: null,
            startedAt,
            finishedAt: null,
            createdAt: startedAt
          });

          try {
            await planningService.projectMissionToPlanningSystem(job.data.missionId);
            await workflowService.recordRun({
              id: randomUUID(),
              planningItemId: job.data.missionId,
              handoffId: null,
              queueJobId: job.id,
              jobName: job.name,
              attempt: job.attempt,
              status: "succeeded",
              correlationId,
              errorSummary: null,
              startedAt,
              finishedAt: new Date().toISOString(),
              createdAt: new Date().toISOString()
            });
          } catch (error) {
            await workflowService.recordRun({
              id: randomUUID(),
              planningItemId: job.data.missionId,
              handoffId: null,
              queueJobId: job.id,
              jobName: job.name,
              attempt: job.attempt,
              status: "failed",
              correlationId,
              errorSummary:
                error instanceof Error ? error.message : "Mission projection failed.",
              startedAt,
              finishedAt: new Date().toISOString(),
              createdAt: new Date().toISOString()
            });

            logger.warn(
              { err: error, missionId: job.data.missionId, queueJobId: job.id },
              "Mission projection to Notion did not complete."
            );
            throw error;
          }
        }
      : null,
    {
      retryLimit: 3,
      retryDelay: 5,
      retryBackoff: true,
      retryDelayMax: 60,
      deadLetter: "mission-project-to-notion-dead-letter"
    }
  );

  await queue.register<{ correlationId?: string }>(
    "planning.sync-from-notion",
    consumersEnabled
      ? async (job) => {
          const startedAt = new Date().toISOString();
          const correlationId = extractCorrelationId(job.data);

          await workflowService.recordRun({
            id: randomUUID(),
            planningItemId: null,
            handoffId: null,
            queueJobId: job.id,
            jobName: job.name,
            attempt: job.attempt,
            status: "running",
            correlationId,
            errorSummary: null,
            startedAt,
            finishedAt: null,
            createdAt: startedAt
          });

          try {
            await planningService.syncPlanningTree();
            await workflowService.recordRun({
              id: randomUUID(),
              planningItemId: null,
              handoffId: null,
              queueJobId: job.id,
              jobName: job.name,
              attempt: job.attempt,
              status: "succeeded",
              correlationId,
              errorSummary: null,
              startedAt,
              finishedAt: new Date().toISOString(),
              createdAt: new Date().toISOString()
            });
          } catch (error) {
            await workflowService.recordRun({
              id: randomUUID(),
              planningItemId: null,
              handoffId: null,
              queueJobId: job.id,
              jobName: job.name,
              attempt: job.attempt,
              status: "failed",
              correlationId,
              errorSummary:
                error instanceof Error ? error.message : "Planning sync failed.",
              startedAt,
              finishedAt: new Date().toISOString(),
              createdAt: new Date().toISOString()
            });

            logger.warn(
              { err: error, queueJobId: job.id },
              "Planning sync did not complete."
            );
            throw error;
          }
        }
      : null,
    {
      retryLimit: 5,
      retryDelay: 10,
      retryBackoff: true,
      retryDelayMax: 120,
      deadLetter: "planning-sync-from-notion-dead-letter"
    }
  );

  await queue.start();

  return {
    config,
    logger,
    repository,
    queue,
    planningAdapter,
    agentDirectoryService,
    missionService,
    planningService,
    handoffService,
    approvalService,
    validationService,
    governancePolicyService,
    escalationService,
    boardService,
    businessFlowService,
    workflowService,
    optimizationService,
    expansionService,
    memoryService,
    reportingService,
    taskBoardService,
    close: async () => {
      await queue.stop();
    },
    parseMissionInput: (input) => missionCreateInputSchema.parse(input),
    parseHandoffCreateInput: (input) => handoffCreateInputSchema.parse(input),
    parseHandoffResponseInput: (input) =>
      handoffResponseInputSchema.parse(input),
    parseHandoffEscalationInput: (input) =>
      handoffEscalationInputSchema.parse(input),
    parseApprovalCreateInput: (input) =>
      approvalCreateInputSchema.parse(input),
    parseApprovalDecisionInput: (input) =>
      approvalDecisionInputSchema.parse(input),
    parseGovernanceGatePolicyCreateInput: (input) =>
      governanceGatePolicyCreateInputSchema.parse(input),
    parseMemoryCaptureInput: (input) => memoryCaptureInputSchema.parse(input),
    parseOptimizationCreateInput: (input) =>
      optimizationCreateInputSchema.parse(input),
    parseOptimizationDecisionInput: (input) =>
      optimizationDecisionInputSchema.parse(input),
    parseSectorCapabilityCreateInput: (input) =>
      sectorCapabilityCreateInputSchema.parse(input),
    parseAgentOnboardingCreateInput: (input) =>
      agentOnboardingCreateInputSchema.parse(input),
    parseValidationResultInput: (input) =>
      validationResultInputSchema.parse(input)
  };
}

function extractCorrelationId(payload: unknown): string {
  if (
    payload &&
    typeof payload === "object" &&
    "correlationId" in payload &&
    typeof payload.correlationId === "string"
  ) {
    return payload.correlationId;
  }

  return `queue_${randomUUID()}`;
}

function createDefaultAgents(): AgentProfile[] {
  const now = new Date().toISOString();

  return [
    {
      id: randomUUID(),
      name: "Isa Novaes",
      slug: "isa-novaes",
      actorType: "founder",
      sector: "operations",
      phase: "mvp",
      status: "active",
      roles: ["founder"],
      createdAt: now
    },
    {
      id: randomUUID(),
      name: "Vitor Perin",
      slug: "vitor-perin",
      actorType: "founder",
      sector: "operations",
      phase: "mvp",
      status: "active",
      roles: ["founder", "technical_lead", "operator"],
      createdAt: now
    },
    {
      id: randomUUID(),
      name: "OpenClaw",
      slug: "openclaw",
      actorType: "ceo",
      sector: "operations",
      phase: "mvp",
      status: "active",
      roles: ["ceo_orchestrator"],
      createdAt: now
    },
    {
      id: randomUUID(),
      name: "CMO Agent",
      slug: "cmo-agent",
      actorType: "c_level",
      sector: "marketing",
      phase: "mvp",
      status: "active",
      roles: ["c_level"],
      createdAt: now
    },
    {
      id: randomUUID(),
      name: "CRO Agent",
      slug: "cro-agent",
      actorType: "c_level",
      sector: "sales",
      phase: "mvp",
      status: "active",
      roles: ["c_level"],
      createdAt: now
    },
    {
      id: randomUUID(),
      name: "CTO Agent",
      slug: "cto-agent",
      actorType: "c_level",
      sector: "technology",
      phase: "mvp",
      status: "active",
      roles: ["c_level"],
      createdAt: now
    },
    {
      id: randomUUID(),
      name: "Brand Guardian",
      slug: "brand-guardian",
      actorType: "specialist",
      sector: "brand",
      phase: "mvp",
      status: "active",
      roles: ["specialist"],
      createdAt: now
    },
    {
      id: randomUUID(),
      name: "Chief Quality Agent",
      slug: "chief-quality-agent",
      actorType: "specialist",
      sector: "quality",
      phase: "mvp",
      status: "active",
      roles: ["quality_reviewer"],
      createdAt: now
    },
    {
      id: randomUUID(),
      name: "Marketing Squad",
      slug: "marketing-squad",
      actorType: "worker",
      sector: "marketing",
      phase: "mvp",
      status: "active",
      roles: ["squad_executor", "content_operator"],
      createdAt: now
    },
    {
      id: randomUUID(),
      name: "Sales Squad",
      slug: "sales-squad",
      actorType: "worker",
      sector: "sales",
      phase: "mvp",
      status: "active",
      roles: ["squad_executor", "sales_operator"],
      createdAt: now
    },
    {
      id: randomUUID(),
      name: "Technology Squad",
      slug: "technology-squad",
      actorType: "worker",
      sector: "technology",
      phase: "mvp",
      status: "active",
      roles: ["squad_executor", "technology_builder"],
      createdAt: now
    }
  ];
}

async function seedDefaultCapabilities(
  repository: RuntimeRepository
): Promise<void> {
  const existing = await repository.listSectorCapabilities();

  if (existing.length > 0) {
    return;
  }

  const now = new Date().toISOString();
  const agents = await repository.listAgents();
  const ownerBySlug = new Map(agents.map((agent) => [agent.slug, agent.id]));
  const defaults = [
    {
      sector: "marketing",
      capability: "Social content demand engine",
      phase: "mvp" as const,
      status: "active" as const,
      workflowKeys: ["marketing"],
      memoryDomains: ["brand", "offers", "operations"] as const,
      ownerAgentId: ownerBySlug.get("cmo-agent") ?? null
    },
    {
      sector: "sales",
      capability: "Sales enablement and funnel operations",
      phase: "mvp" as const,
      status: "active" as const,
      workflowKeys: ["sales"],
      memoryDomains: ["sales", "operations"] as const,
      ownerAgentId: ownerBySlug.get("cro-agent") ?? null
    },
    {
      sector: "technology",
      capability: "Landing pages, automations and operational infrastructure",
      phase: "mvp" as const,
      status: "active" as const,
      workflowKeys: ["technology"],
      memoryDomains: ["technology", "quality", "operations"] as const,
      ownerAgentId: ownerBySlug.get("cto-agent") ?? null
    },
    {
      sector: "brand",
      capability: "Brand governance and narrative consistency review",
      phase: "mvp" as const,
      status: "active" as const,
      workflowKeys: ["marketing"],
      memoryDomains: ["brand", "operations"] as const,
      ownerAgentId: ownerBySlug.get("brand-guardian") ?? null
    },
    {
      sector: "quality",
      capability: "Quality gate and go-live validation",
      phase: "mvp" as const,
      status: "active" as const,
      workflowKeys: ["technology"],
      memoryDomains: ["quality", "operations"] as const,
      ownerAgentId: ownerBySlug.get("chief-quality-agent") ?? null
    }
  ];

  for (const capability of defaults) {
    await repository.createSectorCapability({
      id: randomUUID(),
      sector: capability.sector,
      capability: capability.capability,
      phase: capability.phase,
      status: capability.status,
      workflowKeys: [...capability.workflowKeys],
      memoryDomains: [...capability.memoryDomains],
      ownerAgentId: capability.ownerAgentId,
      createdAt: now,
      updatedAt: now
    });
  }
}

async function seedDefaultGovernancePolicies(
  repository: RuntimeRepository
): Promise<void> {
  const existing = await repository.listGovernanceGatePolicies({ active: true });

  if (existing.length > 0) {
    return;
  }

  const now = new Date().toISOString();
  const defaults = [
    {
      key: "marketing-brand-review",
      flowKey: "marketing" as const,
      stage: "validation" as const,
      scope: "task" as const,
      taskSlug: "brand-review",
      sector: "brand",
      active: true,
      validatorSlug: "brand-guardian",
      validationType: "brand",
      initialValidationStatus: "warning" as const,
      findingsTemplate: [
        "Brand gate seeded. Aguarda evidencia final do pacote de campanha antes de virar passed."
      ],
      requestedBySlug: null,
      approverSlug: null,
      approvalType: null,
      decisionNotesTemplate: ""
    },
    {
      key: "marketing-publication-approval",
      flowKey: "marketing" as const,
      stage: "approval" as const,
      scope: "task" as const,
      taskSlug: "approval-package",
      sector: "marketing",
      active: true,
      validatorSlug: null,
      validationType: null,
      initialValidationStatus: null,
      findingsTemplate: [],
      requestedBySlug: "brand-guardian",
      approverSlug: "openclaw",
      approvalType: "publication",
      decisionNotesTemplate:
        "Aguardando decisao final do CEO artificial para liberar a campanha."
    },
    {
      key: "sales-readiness-gate",
      flowKey: "sales" as const,
      stage: "validation" as const,
      scope: "task" as const,
      taskSlug: "sales-script-and-training-pack",
      sector: "sales",
      active: true,
      validatorSlug: "cro-agent",
      validationType: "readiness",
      initialValidationStatus: "warning" as const,
      findingsTemplate: [
        "Sales enablement seeded. Aguarda execucao do treinamento e confirmacao de uso no funil."
      ],
      requestedBySlug: null,
      approverSlug: null,
      approvalType: null,
      decisionNotesTemplate: ""
    },
    {
      key: "sales-funnel-review",
      flowKey: "sales" as const,
      stage: "approval" as const,
      scope: "task" as const,
      taskSlug: "closing-follow-up-and-objection-log",
      sector: "sales",
      active: true,
      validatorSlug: null,
      validationType: null,
      initialValidationStatus: null,
      findingsTemplate: [],
      requestedBySlug: "sales-squad",
      approverSlug: "cro-agent",
      approvalType: "funnel_review",
      decisionNotesTemplate: "Aguardando revisao do CRO sobre o progresso comercial."
    },
    {
      key: "technology-quality-gate",
      flowKey: "technology" as const,
      stage: "validation" as const,
      scope: "task" as const,
      taskSlug: "quality-validation-and-go-live-brief",
      sector: "quality",
      active: true,
      validatorSlug: "chief-quality-agent",
      validationType: "quality",
      initialValidationStatus: "warning" as const,
      findingsTemplate: [
        "Quality gate seeded. Aguarda evidencia de landing page, automacao e infraestrutura antes da aprovacao final."
      ],
      requestedBySlug: null,
      approverSlug: null,
      approvalType: null,
      decisionNotesTemplate: ""
    },
    {
      key: "technology-founder-approval",
      flowKey: "technology" as const,
      stage: "approval" as const,
      scope: "project" as const,
      taskSlug: null,
      sector: "operations",
      active: true,
      validatorSlug: null,
      validationType: null,
      initialValidationStatus: null,
      findingsTemplate: [],
      requestedBySlug: "chief-quality-agent",
      approverSlug: "vitor-perin",
      approvalType: "quality_gate",
      decisionNotesTemplate:
        "Aguardando decisao final do founder apos o parecer de Quality."
    }
  ];

  for (const policy of defaults) {
    await repository.createGovernanceGatePolicy({
      id: randomUUID(),
      ...policy,
      createdAt: now,
      updatedAt: now
    });
  }
}
