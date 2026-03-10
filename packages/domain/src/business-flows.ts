import { randomUUID } from "node:crypto";
import type {
  AgentProfile,
  ApprovalDecision,
  AuditEvent,
  BusinessFlowKey,
  GovernanceGatePolicy,
  FlowBootstrapResult,
  Handoff,
  MemoryRecord,
  Mission,
  PlanningItem,
  ValidationResult,
  WorkflowRun
} from "@gmv/contracts";
import {
  approvalDecisionSchema,
  auditEventSchema,
  flowBootstrapResultSchema,
  handoffSchema,
  memoryRecordSchema,
  planningItemSchema,
  validationResultSchema,
  workflowRunSchema
} from "@gmv/contracts";
import { createCorrelationId } from "@gmv/observability";
import type { RuntimeRepository } from "./index.js";
import { assertRouteAvailable } from "./governance.js";

type AgentDirectory = {
  byId: Map<string, AgentProfile>;
  bySlug: Map<string, AgentProfile>;
};

export class BusinessFlowService {
  constructor(private readonly repository: RuntimeRepository) {}

  async bootstrapFlow(
    missionId: string,
    flow: BusinessFlowKey
  ): Promise<FlowBootstrapResult> {
    const mission = await this.repository.getMission(missionId);

    if (!mission) {
      throw new Error(`Mission not found: ${missionId}`);
    }

    const agents = await this.repository.listAgents();
    const directory = createAgentDirectory(agents);
    const existingPlanningItems = await this.repository.listPlanningItems({
      missionId
    });

    assertFlowDependencies(flow, missionId, existingPlanningItems);

    const planningItems = [
      ensureMissionProjectItem(mission, directory),
      ...buildFlowPlanningItems(mission, flow, directory)
    ];

    await this.repository.upsertPlanningItems(planningItems);

    const createdHandoffs = await this.ensureFlowHandoffs(
      mission,
      flow,
      directory
    );
    const createdApprovals = await this.ensureFlowApprovals(
      mission,
      flow,
      directory
    );
    const createdValidations = await this.ensureFlowValidations(
      mission,
      flow,
      directory
    );
    await this.ensureFlowWorkflowRuns(mission, flow);
    await this.ensureFlowMemory(mission, flow);

    await this.repository.updateMission(mission.id, {
      status: "in_execution",
      updatedAt: new Date().toISOString()
    });
    await this.repository.appendAuditEvent(
      createAuditEvent(
        "mission",
        mission.id,
        `flow.${flow}.bootstrapped`,
        mission.ownerAgentId,
        createCorrelationId("flow"),
        {
          flow,
          planningItems: planningItems.length,
          handoffs: createdHandoffs.length,
          approvals: createdApprovals.length,
          validations: createdValidations.length
        }
      )
    );

    return flowBootstrapResultSchema.parse({
      missionId: mission.id,
      flow,
      projectId: missionProjectId(mission.id),
      counts: {
        planningItems: planningItems.length,
        handoffs: createdHandoffs.length,
        approvals: createdApprovals.length,
        validations: createdValidations.length
      },
      planningItems,
      handoffs: createdHandoffs,
      approvals: createdApprovals,
      validations: createdValidations
    });
  }

  private async ensureFlowHandoffs(
    mission: Mission,
    flow: BusinessFlowKey,
    directory: AgentDirectory
  ): Promise<Handoff[]> {
    const definitions = buildFlowHandoffDefinitions(mission.id, flow);
    const existing = await this.repository.listHandoffs();
    const created: Handoff[] = [];

    for (const definition of definitions) {
      const origin = getAgentBySlug(directory, definition.originSlug);
      const target = getAgentBySlug(directory, definition.targetSlug);
      const duplicate = existing.find(
        (candidate) =>
          candidate.taskId === definition.taskId &&
          candidate.originAgentId === origin.id &&
          candidate.targetAgentId === target.id &&
          candidate.taskType === definition.taskType
      );

      if (duplicate) {
        created.push(duplicate);
        continue;
      }

      await assertRouteAvailable(this.repository, origin, target);

      const now = new Date().toISOString();
      const handoff = handoffSchema.parse({
        id: randomUUID(),
        taskId: definition.taskId,
        originAgentId: origin.id,
        targetAgentId: target.id,
        taskType: definition.taskType,
        priority: definition.priority,
        context: definition.context,
        input: definition.input,
        expectedOutput: definition.expectedOutput,
        deadline: null,
        validationRules: definition.validationRules,
        status: "pending",
        result: {},
        confidence: null,
        notes: "",
        needsValidation: definition.needsValidation,
        createdAt: now,
        updatedAt: now
      });

      await this.repository.createHandoff(handoff);
      await this.repository.appendAuditEvent(
        createAuditEvent(
          "handoff",
          handoff.id,
          "handoff.seeded",
          origin.id,
          createCorrelationId("handoff"),
          {
            flow,
            taskId: handoff.taskId,
            targetAgentId: handoff.targetAgentId
          }
        )
      );

      existing.push(handoff);
      created.push(handoff);
    }

    return created;
  }

  private async ensureFlowApprovals(
    mission: Mission,
    flow: BusinessFlowKey,
    directory: AgentDirectory
  ): Promise<ApprovalDecision[]> {
    const policies = await this.repository.listGovernanceGatePolicies({
      flowKey: flow,
      stage: "approval",
      active: true
    });
    const definitions =
      policies.length > 0
        ? buildGovernanceApprovalDefinitions(mission.id, flow, policies)
        : buildFlowApprovalDefinitions(mission.id, flow);
    const existing = await this.repository.listApprovals();
    const created: ApprovalDecision[] = [];

    for (const definition of definitions) {
      const requester = getAgentBySlug(directory, definition.requestedBySlug);
      const approver = getAgentBySlug(directory, definition.approverSlug);
      const duplicate = existing.find(
        (candidate) =>
          candidate.planningItemId === definition.planningItemId &&
          candidate.requestedByAgentId === requester.id &&
          candidate.approverAgentId === approver.id &&
          candidate.approvalType === definition.approvalType
      );

      if (duplicate) {
        created.push(duplicate);
        continue;
      }

      const approval = approvalDecisionSchema.parse({
        id: randomUUID(),
        planningItemId: definition.planningItemId,
        requestedByAgentId: requester.id,
        approverAgentId: approver.id,
        approvalType: definition.approvalType,
        status: "pending",
        decisionNotes: definition.decisionNotes,
        createdAt: new Date().toISOString()
      });

      await this.repository.createApproval(approval);
      await this.repository.appendAuditEvent(
        createAuditEvent(
          "approval",
          approval.id,
          "approval.seeded",
          requester.id,
          createCorrelationId("approval"),
          {
            flow,
            planningItemId: approval.planningItemId,
            approverAgentId: approval.approverAgentId
          }
        )
      );

      existing.push(approval);
      created.push(approval);
    }

    return created;
  }

  private async ensureFlowValidations(
    mission: Mission,
    flow: BusinessFlowKey,
    directory: AgentDirectory
  ): Promise<ValidationResult[]> {
    const policies = await this.repository.listGovernanceGatePolicies({
      flowKey: flow,
      stage: "validation",
      active: true
    });
    const definitions =
      policies.length > 0
        ? buildGovernanceValidationDefinitions(mission.id, flow, policies)
        : buildFlowValidationDefinitions(mission.id, flow);
    const existing = await this.repository.listValidations();
    const created: ValidationResult[] = [];

    for (const definition of definitions) {
      const validator = getAgentBySlug(directory, definition.validatorSlug);
      const duplicate = existing.find(
        (candidate) =>
          candidate.planningItemId === definition.planningItemId &&
          candidate.validatorAgentId === validator.id &&
          candidate.validationType === definition.validationType
      );

      if (duplicate) {
        created.push(duplicate);
        continue;
      }

      const validation = validationResultSchema.parse({
        id: randomUUID(),
        planningItemId: definition.planningItemId,
        validatorAgentId: validator.id,
        validationType: definition.validationType,
        status: definition.status,
        findings: definition.findings,
        validatedAt: new Date().toISOString()
      });

      await this.repository.createValidation(validation);
      await this.repository.appendAuditEvent(
        createAuditEvent(
          "validation",
          validation.id,
          "validation.seeded",
          validator.id,
          createCorrelationId("validation"),
          {
            flow,
            planningItemId: validation.planningItemId,
            status: validation.status
          }
        )
      );

      existing.push(validation);
      created.push(validation);
    }

    return created;
  }

  private async ensureFlowWorkflowRuns(
    mission: Mission,
    flow: BusinessFlowKey
  ): Promise<WorkflowRun[]> {
    const definitions = buildFlowWorkflowDefinitions(mission.id, flow);
    const existing = await this.repository.listWorkflowRuns({
      missionId: mission.id
    });
    const created: WorkflowRun[] = [];

    for (const definition of definitions) {
      const duplicate = existing.find(
        (candidate) =>
          candidate.jobName === definition.jobName &&
          candidate.planningItemId === definition.planningItemId &&
          candidate.status === definition.status
      );

      if (duplicate) {
        created.push(duplicate);
        continue;
      }

      const run = workflowRunSchema.parse({
        id: randomUUID(),
        planningItemId: definition.planningItemId,
        handoffId: null,
        jobName: definition.jobName,
        attempt: 1,
        status: definition.status,
        correlationId: createCorrelationId("workflow"),
        errorSummary: null,
        startedAt: definition.startedAt,
        finishedAt: definition.finishedAt,
        createdAt: new Date().toISOString()
      });

      await this.repository.createWorkflowRun(run);
      await this.repository.appendAuditEvent(
        createAuditEvent(
          "workflow_run",
          run.id,
          `workflow.${run.status}`,
          null,
          run.correlationId,
          {
            flow,
            planningItemId: run.planningItemId,
            jobName: run.jobName
          }
        )
      );

      existing.push(run);
      created.push(run);
    }

    return created;
  }

  private async ensureFlowMemory(
    mission: Mission,
    flow: BusinessFlowKey
  ): Promise<MemoryRecord[]> {
    const definitions = buildFlowMemoryDefinitions(mission, flow);
    const existing = await this.repository.listMemoryRecords({
      missionId: mission.id
    });
    const created: MemoryRecord[] = [];

    for (const definition of definitions) {
      const duplicate = existing.find(
        (candidate) =>
          candidate.domain === definition.domain &&
          candidate.title === definition.title &&
          candidate.linkedMissionId === mission.id
      );

      if (duplicate) {
        created.push(duplicate);
        continue;
      }

      const record = memoryRecordSchema.parse({
        id: randomUUID(),
        domain: definition.domain,
        title: definition.title,
        summary: definition.summary,
        bodyRef: definition.bodyRef,
        tags: definition.tags,
        sourceType: definition.sourceType,
        linkedPlanningItemId: definition.linkedPlanningItemId,
        linkedMissionId: mission.id,
        createdAt: new Date().toISOString()
      });

      await this.repository.saveMemoryRecord(record);
      await this.repository.appendAuditEvent(
        createAuditEvent(
          "memory_record",
          record.id,
          "memory.captured",
          mission.ownerAgentId,
          createCorrelationId("memory"),
          {
            flow,
            domain: record.domain,
            linkedPlanningItemId: record.linkedPlanningItemId
          }
        )
      );

      existing.push(record);
      created.push(record);
    }

    return created;
  }
}

function ensureMissionProjectItem(
  mission: Mission,
  directory: AgentDirectory
): PlanningItem {
  return planningItemSchema.parse({
    id: missionProjectId(mission.id),
    missionId: mission.id,
    parentId: null,
    notionPageId: mission.notionProjectPageId,
    kind: "project",
    title: mission.title,
    description: mission.objective,
    sector: "operations",
    priority: mission.priority,
    processType: mission.processType,
    planningStatus: "in_progress",
    executionStatus: mission.status === "completed" ? "completed" : "running",
    ownerAgentId:
      getAgentById(directory, mission.ownerAgentId)?.id ?? mission.ownerAgentId,
    externalUrl: mission.notionProjectUrl,
    contextSummary: mission.objective,
    acceptanceCriteria: mission.successCriteria,
    dependencies: [],
    inputSummary: "Missao aprovada pelos fundadores para execucao agent-first.",
    expectedOutput:
      "Operacao coordenada entre Marketing, Sales e Technology refletida no Notion.",
    validationNeeded: false,
    createdAt: mission.createdAt,
    updatedAt: new Date().toISOString()
  });
}

function buildFlowPlanningItems(
  mission: Mission,
  flow: BusinessFlowKey,
  directory: AgentDirectory
): PlanningItem[] {
  const createdAt = new Date().toISOString();
  const projectId = missionProjectId(mission.id);

  if (flow === "marketing") {
    return buildMarketingPlanningItems(mission, directory, projectId, createdAt);
  }

  if (flow === "sales") {
    return buildSalesPlanningItems(mission, directory, projectId, createdAt);
  }

  return buildTechnologyPlanningItems(mission, directory, projectId, createdAt);
}

function buildMarketingPlanningItems(
  mission: Mission,
  directory: AgentDirectory,
  projectId: string,
  createdAt: string
): PlanningItem[] {
  const flow = "marketing";
  const epicId = flowItemId(mission.id, flow, "epic", "social-content-engine");
  const editorialStoryId = flowItemId(
    mission.id,
    flow,
    "story",
    "manifesto-editorial-and-calendar"
  );
  const productionStoryId = flowItemId(
    mission.id,
    flow,
    "story",
    "scripts-copy-and-creatives"
  );
  const reviewStoryId = flowItemId(
    mission.id,
    flow,
    "story",
    "brand-review-and-final-approval"
  );

  return [
    createPlanningItem({
      id: epicId,
      missionId: mission.id,
      parentId: projectId,
      kind: "epic",
      title: "Marketing Workflow",
      description:
        "Fluxo ponta a ponta para manifesto/editorial, calendario, roteiro, copy, criativos e aprovacao final.",
      sector: "marketing",
      priority: "high",
      processType: "operational",
      planningStatus: "ready",
      executionStatus: "running",
      ownerAgentId: getAgentBySlug(directory, "cmo-agent").id,
      contextSummary:
        "A missao precisa gerar demanda recorrente com governanca de Brand e rastreabilidade por campanha e canal.",
      acceptanceCriteria: [
        "Cobre manifesto/editorial, calendario, roteiro, copy, criativo e aprovacao final.",
        "Relaciona cada entrega de conteudo a campanha, objetivo e canal.",
        "Registra revisoes e validacoes de Brand."
      ],
      inputSummary: "Missao do founder e contexto do OpenClaw.",
      expectedOutput: "Pacote de campanha pronto para abastecer Marketing e Sales.",
      validationNeeded: false,
      createdAt
    }),
    createPlanningItem({
      id: editorialStoryId,
      missionId: mission.id,
      parentId: epicId,
      kind: "story",
      title: "Define manifesto, editorial angle and campaign calendar",
      description: "Transforma a missao em narrativa editorial operavel.",
      sector: "marketing",
      priority: "high",
      processType: "strategic",
      planningStatus: "ready",
      executionStatus: "queued",
      ownerAgentId: getAgentBySlug(directory, "cmo-agent").id,
      contextSummary:
        "O CMO precisa fechar posicionamento, objetivo da campanha e calendario por canal.",
      acceptanceCriteria: [
        "Manifesto editorial claro e reutilizavel.",
        "Calendario de campanha com objetivo e canal.",
        "Contexto suficiente para execucao do squad."
      ],
      inputSummary: "Brief da missao, ICP odontologico e contexto de growth.",
      expectedOutput: "Narrativa editorial e calendario inicial.",
      validationNeeded: false,
      createdAt
    }),
    createPlanningItem({
      id: flowItemId(mission.id, flow, "task", "manifesto-editorial-brief"),
      missionId: mission.id,
      parentId: editorialStoryId,
      kind: "task",
      title: "Create the manifesto and editorial brief",
      description: "Consolida tema, promessa, canal e campanha.",
      sector: "marketing",
      priority: "high",
      processType: "strategic",
      planningStatus: "ready",
      executionStatus: "queued",
      ownerAgentId: getAgentBySlug(directory, "cmo-agent").id,
      contextSummary:
        "A campanha precisa nascer com tese editorial coerente para o mercado odontologico.",
      acceptanceCriteria: [
        "Define manifesto editorial.",
        "Liga a campanha ao objetivo da missao.",
        "Explica tese de posicionamento e call to action."
      ],
      inputSummary: "Missao, objetivo e metas de growth.",
      expectedOutput: "Brief editorial validado pelo CMO.",
      validationNeeded: false,
      createdAt
    }),
    createPlanningItem({
      id: flowItemId(mission.id, flow, "task", "campaign-calendar"),
      missionId: mission.id,
      parentId: editorialStoryId,
      kind: "task",
      title: "Plan the campaign calendar by channel",
      description: "Define cadencia por canal e dependencias da campanha.",
      sector: "marketing",
      priority: "high",
      processType: "operational",
      planningStatus: "ready",
      executionStatus: "queued",
      ownerAgentId: getAgentBySlug(directory, "marketing-squad").id,
      contextSummary:
        "O calendario precisa amarrar campanha, objetivo, canal e janela de execucao.",
      acceptanceCriteria: [
        "Calendario relaciona canal, objetivo e ativo.",
        "Dependencias registradas para o squad.",
        "Janela semanal definida."
      ],
      dependencies: [
        flowItemId(mission.id, flow, "task", "manifesto-editorial-brief")
      ],
      inputSummary: "Brief editorial aprovado.",
      expectedOutput: "Calendario de campanha com entregas por canal.",
      validationNeeded: false,
      createdAt
    }),
    createPlanningItem({
      id: productionStoryId,
      missionId: mission.id,
      parentId: epicId,
      kind: "story",
      title: "Produce scripts, copy and creative assets",
      description: "Organiza os ativos de conteudo para execucao do squad.",
      sector: "marketing",
      priority: "high",
      processType: "operational",
      planningStatus: "ready",
      executionStatus: "queued",
      ownerAgentId: getAgentBySlug(directory, "marketing-squad").id,
      contextSummary:
        "O squad precisa transformar a narrativa aprovada em roteiro, copy e criativo reutilizavel.",
      acceptanceCriteria: [
        "Roteiro pronto para gravacao ou producao.",
        "Copy alinhada ao canal e CTA.",
        "Criativo preparado para Brand."
      ],
      dependencies: [editorialStoryId],
      inputSummary: "Narrativa editorial e calendario.",
      expectedOutput: "Pacote de assets de campanha.",
      validationNeeded: false,
      createdAt
    }),
    createPlanningItem({
      id: flowItemId(mission.id, flow, "task", "social-script"),
      missionId: mission.id,
      parentId: productionStoryId,
      kind: "task",
      title: "Draft the weekly social script",
      description: "Roteiro principal para conteudo recorrente.",
      sector: "marketing",
      priority: "high",
      processType: "operational",
      planningStatus: "ready",
      executionStatus: "queued",
      ownerAgentId: getAgentBySlug(directory, "marketing-squad").id,
      contextSummary:
        "Cada conteudo precisa traduzir a narrativa da campanha em roteiro pratico.",
      acceptanceCriteria: [
        "Roteiro possui abertura, argumento central e CTA.",
        "Canal e formato explicitados.",
        "Pronto para copy e criativo."
      ],
      dependencies: [
        flowItemId(mission.id, flow, "task", "campaign-calendar")
      ],
      inputSummary: "Calendario aprovado e objetivo da campanha.",
      expectedOutput: "Roteiro markdown para producao.",
      validationNeeded: false,
      createdAt
    }),
    createPlanningItem({
      id: flowItemId(mission.id, flow, "task", "campaign-copy"),
      missionId: mission.id,
      parentId: productionStoryId,
      kind: "task",
      title: "Write the channel copy package",
      description: "Copy principal e adaptacoes de CTA.",
      sector: "marketing",
      priority: "high",
      processType: "operational",
      planningStatus: "ready",
      executionStatus: "queued",
      ownerAgentId: getAgentBySlug(directory, "marketing-squad").id,
      contextSummary:
        "A copy precisa acompanhar o roteiro e manter consistencia de oferta.",
      acceptanceCriteria: [
        "Copy com CTA e prova.",
        "Variacoes por canal quando necessario.",
        "Tom coerente com a brand voice."
      ],
      dependencies: [flowItemId(mission.id, flow, "task", "social-script")],
      inputSummary: "Roteiro e tese editorial.",
      expectedOutput: "Pacote de copy aprovado para campanha.",
      validationNeeded: false,
      createdAt
    }),
    createPlanningItem({
      id: flowItemId(mission.id, flow, "task", "creative-package"),
      missionId: mission.id,
      parentId: productionStoryId,
      kind: "task",
      title: "Assemble the creative package",
      description: "Direcao criativa, referencia visual e ativos do conteudo.",
      sector: "marketing",
      priority: "high",
      processType: "operational",
      planningStatus: "ready",
      executionStatus: "queued",
      ownerAgentId: getAgentBySlug(directory, "marketing-squad").id,
      contextSummary:
        "Criativos precisam fechar o pacote final para Brand validar consistencia.",
      acceptanceCriteria: [
        "Direcao criativa documentada.",
        "Ativos relacionados a campanha e canal.",
        "Pronto para brand review."
      ],
      dependencies: [flowItemId(mission.id, flow, "task", "campaign-copy")],
      inputSummary: "Copy final e referencias de campanha.",
      expectedOutput: "Pacote criativo pronto para revisao.",
      validationNeeded: false,
      createdAt
    }),
    createPlanningItem({
      id: reviewStoryId,
      missionId: mission.id,
      parentId: epicId,
      kind: "story",
      title: "Run brand review and final marketing approval",
      description: "Garante coerencia de marca antes da passagem para Sales.",
      sector: "brand",
      priority: "high",
      processType: "governance",
      planningStatus: "ready",
      executionStatus: "queued",
      ownerAgentId: getAgentBySlug(directory, "brand-guardian").id,
      contextSummary:
        "Brand precisa revisar a campanha antes da aprovacao final pelo OpenClaw.",
      acceptanceCriteria: [
        "Brand review registrada.",
        "Aprovacao final pendurada em artefato rastreavel.",
        "Output disponivel para reuso e handoff para Sales."
      ],
      dependencies: [productionStoryId],
      inputSummary: "Pacote de campanha completo.",
      expectedOutput: "Campanha aprovada e pronta para vendas.",
      validationNeeded: true,
      createdAt
    }),
    createPlanningItem({
      id: flowItemId(mission.id, flow, "task", "brand-review"),
      missionId: mission.id,
      parentId: reviewStoryId,
      kind: "task",
      title: "Review brand consistency across the campaign package",
      description: "Valida narrativa, tom e consistencia do pacote.",
      sector: "brand",
      priority: "high",
      processType: "governance",
      planningStatus: "waiting_validation",
      executionStatus: "queued",
      ownerAgentId: getAgentBySlug(directory, "brand-guardian").id,
      contextSummary:
        "A campanha so pode alimentar Sales depois da validacao de Brand.",
      acceptanceCriteria: [
        "Narrativa consistente com a brand voice.",
        "Canal e campanha corretamente identificados.",
        "Parecer registrado."
      ],
      dependencies: [flowItemId(mission.id, flow, "task", "creative-package")],
      inputSummary: "Pacote final de roteiro, copy e criativo.",
      expectedOutput: "Parecer de Brand com ajustes ou liberacao.",
      validationNeeded: true,
      createdAt
    }),
    createPlanningItem({
      id: flowItemId(mission.id, flow, "task", "approval-package"),
      missionId: mission.id,
      parentId: reviewStoryId,
      kind: "task",
      title: "Prepare the final approval package for OpenClaw",
      description: "Consolida artefatos e decisao final do setor.",
      sector: "marketing",
      priority: "high",
      processType: "governance",
      planningStatus: "waiting_validation",
      executionStatus: "queued",
      ownerAgentId: getAgentBySlug(directory, "openclaw").id,
      contextSummary:
        "OpenClaw precisa decidir se a campanha segue para execucao e abastece Sales.",
      acceptanceCriteria: [
        "Artefatos e parecer de Brand anexados.",
        "Relacionamento com campanha, objetivo e canal preservado.",
        "Pronto para aprovacao."
      ],
      dependencies: [flowItemId(mission.id, flow, "task", "brand-review")],
      inputSummary: "Parecer de Brand e pacote de campanha.",
      expectedOutput: "Aprovacao final de marketing.",
      validationNeeded: false,
      createdAt
    })
  ];
}

function buildSalesPlanningItems(
  mission: Mission,
  directory: AgentDirectory,
  projectId: string,
  createdAt: string
): PlanningItem[] {
  const flow = "sales";
  const epicId = flowItemId(mission.id, flow, "epic", "sales-enablement-and-funnel");
  const enablementStoryId = flowItemId(
    mission.id,
    flow,
    "story",
    "training-scripts-and-objection-handling"
  );
  const funnelStoryId = flowItemId(
    mission.id,
    flow,
    "story",
    "lead-appointment-attendance-and-closing"
  );
  const supportStoryId = flowItemId(
    mission.id,
    flow,
    "story",
    "infrastructure-requests-and-revenue-ops"
  );

  return [
    createPlanningItem({
      id: epicId,
      missionId: mission.id,
      parentId: projectId,
      kind: "epic",
      title: "Sales Workflow",
      description:
        "Fluxo de enablement comercial, progressao de funil e pedidos de suporte tecnico.",
      sector: "sales",
      priority: "high",
      processType: "operational",
      planningStatus: "ready",
      executionStatus: "running",
      ownerAgentId: getAgentBySlug(directory, "cro-agent").id,
      contextSummary:
        "Sales precisa consumir os assets de Marketing e transformar a demanda em progresso de funil.",
      acceptanceCriteria: [
        "Cobre treinamento comercial, agendamento, comparecimento e fechamento.",
        "Relaciona materiais de vendas a resultados de funil.",
        "Registra handoffs com Marketing e Technology."
      ],
      dependencies: [
        flowItemId(mission.id, "marketing", "epic", "social-content-engine")
      ],
      inputSummary: "Campanha aprovada pelo Marketing.",
      expectedOutput: "Fluxo comercial com visibilidade de avance e dependencias.",
      validationNeeded: false,
      createdAt
    }),
    createPlanningItem({
      id: enablementStoryId,
      missionId: mission.id,
      parentId: epicId,
      kind: "story",
      title: "Enable the sales squad with scripts and training",
      description: "Traduz a campanha de Marketing em operacao comercial.",
      sector: "sales",
      priority: "high",
      processType: "operational",
      planningStatus: "ready",
      executionStatus: "queued",
      ownerAgentId: getAgentBySlug(directory, "cro-agent").id,
      contextSummary:
        "O CRO precisa transformar campanha e oferta em script, treinamento e criterios de qualificacao.",
      acceptanceCriteria: [
        "Script comercial e treinamento preparados.",
        "Conexao explicita com a campanha de Marketing.",
        "Pronto para qualificacao do funil."
      ],
      dependencies: [flowItemId(mission.id, "marketing", "task", "approval-package")],
      inputSummary: "Pacote final de campanha aprovado.",
      expectedOutput: "Enablement comercial pronto para uso.",
      validationNeeded: true,
      createdAt
    }),
    createPlanningItem({
      id: flowItemId(mission.id, flow, "task", "sales-script-and-training-pack"),
      missionId: mission.id,
      parentId: enablementStoryId,
      kind: "task",
      title: "Build the sales script and training pack",
      description: "Prepara materiais comerciais a partir dos assets de Marketing.",
      sector: "sales",
      priority: "high",
      processType: "operational",
      planningStatus: "ready",
      executionStatus: "queued",
      ownerAgentId: getAgentBySlug(directory, "sales-squad").id,
      contextSummary:
        "O time comercial precisa de script, objeções e roteiro de treinamento ligados a campanha.",
      acceptanceCriteria: [
        "Script com objeções e CTA.",
        "Treinamento relacionado a campanha.",
        "Material pronto para qualificacao."
      ],
      dependencies: [
        flowItemId(mission.id, "marketing", "task", "campaign-copy"),
        flowItemId(mission.id, "marketing", "task", "creative-package")
      ],
      inputSummary: "Copy, criativos e objetivo da campanha.",
      expectedOutput: "Pacote de sales enablement.",
      validationNeeded: true,
      createdAt
    }),
    createPlanningItem({
      id: funnelStoryId,
      missionId: mission.id,
      parentId: epicId,
      kind: "story",
      title: "Track qualification, scheduling, attendance and closing",
      description: "Representa os principais estagios do funil comercial do MVP.",
      sector: "sales",
      priority: "high",
      processType: "operational",
      planningStatus: "ready",
      executionStatus: "queued",
      ownerAgentId: getAgentBySlug(directory, "sales-squad").id,
      contextSummary:
        "O funil precisa mostrar lead/agendamento, comparecimento e fechamento com visibilidade executiva.",
      acceptanceCriteria: [
        "Estados principais do funil registrados.",
        "Dependencias e handoffs visiveis.",
        "Fechamento e no-show recuperados."
      ],
      dependencies: [enablementStoryId],
      inputSummary: "Script comercial e treinamento.",
      expectedOutput: "Funil comercial operavel e rastreavel.",
      validationNeeded: false,
      createdAt
    }),
    createPlanningItem({
      id: flowItemId(mission.id, flow, "task", "lead-qualification-and-scheduling"),
      missionId: mission.id,
      parentId: funnelStoryId,
      kind: "task",
      title: "Qualify leads and move them to scheduling",
      description: "Primeira passagem do funil com criterio comercial.",
      sector: "sales",
      priority: "high",
      processType: "operational",
      planningStatus: "ready",
      executionStatus: "queued",
      ownerAgentId: getAgentBySlug(directory, "sales-squad").id,
      contextSummary:
        "A equipe precisa qualificar leads e transformar interesse em agendamento.",
      acceptanceCriteria: [
        "Lead status registrado.",
        "Agendamento encaminhado quando qualificado.",
        "Criticos e bloqueios identificados."
      ],
      dependencies: [
        flowItemId(mission.id, flow, "task", "sales-script-and-training-pack")
      ],
      inputSummary: "Script comercial e criterios de qualificacao.",
      expectedOutput: "Leads qualificados e agendados.",
      validationNeeded: false,
      createdAt
    }),
    createPlanningItem({
      id: flowItemId(
        mission.id,
        flow,
        "task",
        "attendance-confirmation-and-no-show-recovery"
      ),
      missionId: mission.id,
      parentId: funnelStoryId,
      kind: "task",
      title: "Confirm attendance and recover no-shows",
      description: "Garante comparecimento e trata perdas de agendamento.",
      sector: "sales",
      priority: "high",
      processType: "operational",
      planningStatus: "ready",
      executionStatus: "queued",
      ownerAgentId: getAgentBySlug(directory, "sales-squad").id,
      contextSummary:
        "O MVP precisa controlar comparecimento e recuperar no-show.",
      acceptanceCriteria: [
        "Comparecimento confirmado.",
        "No-show tratado com follow-up.",
        "Mudancas visiveis no funil."
      ],
      dependencies: [
        flowItemId(mission.id, flow, "task", "lead-qualification-and-scheduling")
      ],
      inputSummary: "Leads agendados.",
      expectedOutput: "Pipeline atualizado com comparecimento.",
      validationNeeded: false,
      createdAt
    }),
    createPlanningItem({
      id: flowItemId(mission.id, flow, "task", "closing-follow-up-and-objection-log"),
      missionId: mission.id,
      parentId: funnelStoryId,
      kind: "task",
      title: "Run closing follow-up and capture objections",
      description: "Fecha o ciclo comercial e registra aprendizado.",
      sector: "sales",
      priority: "high",
      processType: "optimization",
      planningStatus: "ready",
      executionStatus: "queued",
      ownerAgentId: getAgentBySlug(directory, "sales-squad").id,
      contextSummary:
        "Fechamento e objecoes precisam ficar ligados aos materiais e performance da campanha.",
      acceptanceCriteria: [
        "Fechamento ou proximo passo registrado.",
        "Objecoes catalogadas.",
        "Aprendizado devolvido para o sistema."
      ],
      dependencies: [
        flowItemId(
          mission.id,
          flow,
          "task",
          "attendance-confirmation-and-no-show-recovery"
        )
      ],
      inputSummary: "Comparecimento e historico do lead.",
      expectedOutput: "Fechamento e learning loop do funil.",
      validationNeeded: false,
      createdAt
    }),
    createPlanningItem({
      id: supportStoryId,
      missionId: mission.id,
      parentId: epicId,
      kind: "story",
      title: "Request revenue operations support from Technology",
      description: "Formaliza as dependencias tecnicas do funil comercial.",
      sector: "sales",
      priority: "high",
      processType: "governance",
      planningStatus: "ready",
      executionStatus: "queued",
      ownerAgentId: getAgentBySlug(directory, "sales-squad").id,
      contextSummary:
        "Sales precisa pedir automacoes e suporte tecnico quando o fluxo exigir infraestrutura.",
      acceptanceCriteria: [
        "Pedido tecnico com contexto, objetivo e dependencia.",
        "Handoff registrado para Technology.",
        "Backlog de suporte rastreavel."
      ],
      dependencies: [funnelStoryId],
      inputSummary: "Necessidades de funil e revenue ops.",
      expectedOutput: "Request tecnico pronto para Technology.",
      validationNeeded: false,
      createdAt
    }),
    createPlanningItem({
      id: flowItemId(
        mission.id,
        flow,
        "task",
        "booking-and-follow-up-automation-request"
      ),
      missionId: mission.id,
      parentId: supportStoryId,
      kind: "task",
      title: "Open the booking and follow-up automation request",
      description: "Empacota a necessidade tecnica do funil para o CTO e o squad.",
      sector: "sales",
      priority: "high",
      processType: "operational",
      planningStatus: "ready",
      executionStatus: "queued",
      ownerAgentId: getAgentBySlug(directory, "sales-squad").id,
      contextSummary:
        "A equipe comercial precisa de suporte tecnico para automacao e ativos de conversao.",
      acceptanceCriteria: [
        "Origem, contexto e output esperado definidos.",
        "Dependencias do funil registradas.",
        "Pronto para handoff a Technology."
      ],
      dependencies: [
        flowItemId(mission.id, flow, "task", "lead-qualification-and-scheduling")
      ],
      inputSummary: "Dados do funil e requisitos de suporte.",
      expectedOutput: "Request tecnico estruturado.",
      validationNeeded: false,
      createdAt
    })
  ];
}

function buildTechnologyPlanningItems(
  mission: Mission,
  directory: AgentDirectory,
  projectId: string,
  createdAt: string
): PlanningItem[] {
  const flow = "technology";
  const epicId = flowItemId(
    mission.id,
    flow,
    "epic",
    "technology-enablement-and-delivery"
  );
  const intakeStoryId = flowItemId(
    mission.id,
    flow,
    "story",
    "demand-intake-and-scope"
  );
  const deliveryStoryId = flowItemId(
    mission.id,
    flow,
    "story",
    "landing-pages-automations-and-infrastructure"
  );
  const qualityStoryId = flowItemId(
    mission.id,
    flow,
    "story",
    "quality-gate-and-executive-decision"
  );

  return [
    createPlanningItem({
      id: epicId,
      missionId: mission.id,
      parentId: projectId,
      kind: "epic",
      title: "Technology Workflow",
      description:
        "Fluxo de intake, entrega tecnica e qualidade para landing pages, automacoes e infraestrutura.",
      sector: "technology",
      priority: "high",
      processType: "operational",
      planningStatus: "ready",
      executionStatus: "running",
      ownerAgentId: getAgentBySlug(directory, "cto-agent").id,
      contextSummary:
        "Technology precisa receber demandas de Marketing e Sales e transforma-las em entrega tecnica rastreavel.",
      acceptanceCriteria: [
        "Cobre landing pages, automacoes e infraestrutura operacional.",
        "Registra handoffs entre Marketing, Sales, Technology e Quality.",
        "Expoe backlog, status e bloqueios tecnicos."
      ],
      dependencies: [
        flowItemId(mission.id, "sales", "epic", "sales-enablement-and-funnel")
      ],
      inputSummary: "Demandas aprovadas de Marketing e Sales.",
      expectedOutput: "Entrega tecnica pronta para validacao e go-live.",
      validationNeeded: false,
      createdAt
    }),
    createPlanningItem({
      id: intakeStoryId,
      missionId: mission.id,
      parentId: epicId,
      kind: "story",
      title: "Receive marketing and sales demands with structured intake",
      description: "Organiza o intake tecnico a partir das areas de negocio.",
      sector: "technology",
      priority: "high",
      processType: "operational",
      planningStatus: "ready",
      executionStatus: "queued",
      ownerAgentId: getAgentBySlug(directory, "cto-agent").id,
      contextSummary:
        "CTO precisa traduzir a necessidade de Marketing e Sales em backlog tecnico claro.",
      acceptanceCriteria: [
        "Origem, objetivo, contexto, dependencia e output esperado definidos.",
        "Demandas separadas por landing page e automacao.",
        "Pronto para execucao do squad."
      ],
      dependencies: [
        flowItemId(mission.id, "marketing", "task", "approval-package"),
        flowItemId(
          mission.id,
          "sales",
          "task",
          "booking-and-follow-up-automation-request"
        )
      ],
      inputSummary: "Demandas aprovadas de Marketing e Sales.",
      expectedOutput: "Backlog tecnico priorizado.",
      validationNeeded: false,
      createdAt
    }),
    createPlanningItem({
      id: flowItemId(mission.id, flow, "task", "landing-page-intake-from-marketing"),
      missionId: mission.id,
      parentId: intakeStoryId,
      kind: "task",
      title: "Open the landing page intake from Marketing",
      description: "Consolida assets de campanha e requisitos da pagina.",
      sector: "technology",
      priority: "high",
      processType: "operational",
      planningStatus: "ready",
      executionStatus: "queued",
      ownerAgentId: getAgentBySlug(directory, "cto-agent").id,
      contextSummary:
        "Landing page precisa herdar campanha, copy e criativos aprovados.",
      acceptanceCriteria: [
        "Origem e assets do Marketing registrados.",
        "Objetivo da pagina documentado.",
        "Pronto para construcao."
      ],
      dependencies: [flowItemId(mission.id, "marketing", "task", "approval-package")],
      inputSummary: "Pacote final de campanha.",
      expectedOutput: "Brief tecnico da landing page.",
      validationNeeded: false,
      createdAt
    }),
    createPlanningItem({
      id: flowItemId(mission.id, flow, "task", "automation-intake-from-sales"),
      missionId: mission.id,
      parentId: intakeStoryId,
      kind: "task",
      title: "Translate the sales automation request into technical scope",
      description: "Traduz o pedido de Sales em backlog de automacao.",
      sector: "technology",
      priority: "high",
      processType: "operational",
      planningStatus: "ready",
      executionStatus: "queued",
      ownerAgentId: getAgentBySlug(directory, "technology-squad").id,
      contextSummary:
        "Sales precisa de booking e follow-up automatizados ligados ao funil.",
      acceptanceCriteria: [
        "Escopo tecnico claro.",
        "Dependencias do funil preservadas.",
        "Pronto para execucao."
      ],
      dependencies: [
        flowItemId(
          mission.id,
          "sales",
          "task",
          "booking-and-follow-up-automation-request"
        )
      ],
      inputSummary: "Request tecnico do funil comercial.",
      expectedOutput: "Escopo de automacao priorizado.",
      validationNeeded: false,
      createdAt
    }),
    createPlanningItem({
      id: deliveryStoryId,
      missionId: mission.id,
      parentId: epicId,
      kind: "story",
      title: "Deliver landing pages, automations and infrastructure",
      description: "Executa os ativos tecnicos centrais do MVP.",
      sector: "technology",
      priority: "high",
      processType: "operational",
      planningStatus: "ready",
      executionStatus: "queued",
      ownerAgentId: getAgentBySlug(directory, "technology-squad").id,
      contextSummary:
        "O squad tecnico precisa entregar landing page, automacoes e suporte operacional.",
      acceptanceCriteria: [
        "Landing page pronta.",
        "Automacoes implementadas.",
        "Infraestrutura operacional documentada."
      ],
      dependencies: [intakeStoryId],
      inputSummary: "Backlog tecnico aprovado pelo CTO.",
      expectedOutput: "Entrega tecnica pronta para Quality.",
      validationNeeded: false,
      createdAt
    }),
    createPlanningItem({
      id: flowItemId(mission.id, flow, "task", "build-landing-page"),
      missionId: mission.id,
      parentId: deliveryStoryId,
      kind: "task",
      title: "Build the landing page for the campaign",
      description: "Entrega o ativo principal de conversao.",
      sector: "technology",
      priority: "high",
      processType: "operational",
      planningStatus: "ready",
      executionStatus: "queued",
      ownerAgentId: getAgentBySlug(directory, "technology-squad").id,
      contextSummary:
        "A pagina precisa usar os assets e a mensagem aprovados por Marketing.",
      acceptanceCriteria: [
        "Pagina pronta para captacao.",
        "Mensagem alinhada a campanha.",
        "Dependencias tecnicas mapeadas."
      ],
      dependencies: [
        flowItemId(mission.id, flow, "task", "landing-page-intake-from-marketing")
      ],
      inputSummary: "Brief tecnico da landing page.",
      expectedOutput: "Landing page funcional.",
      validationNeeded: false,
      createdAt
    }),
    createPlanningItem({
      id: flowItemId(
        mission.id,
        flow,
        "task",
        "implement-booking-and-follow-up-automation"
      ),
      missionId: mission.id,
      parentId: deliveryStoryId,
      kind: "task",
      title: "Implement booking and follow-up automation",
      description: "Conecta funnel e automacoes operacionais do MVP.",
      sector: "technology",
      priority: "high",
      processType: "operational",
      planningStatus: "ready",
      executionStatus: "queued",
      ownerAgentId: getAgentBySlug(directory, "technology-squad").id,
      contextSummary:
        "O funnel comercial precisa de automacao para agendamento e follow-up.",
      acceptanceCriteria: [
        "Automacao cobre booking e follow-up.",
        "Fluxo comercial preservado.",
        "Backlog e dependencia rastreaveis."
      ],
      dependencies: [
        flowItemId(mission.id, flow, "task", "automation-intake-from-sales")
      ],
      inputSummary: "Escopo de automacao.",
      expectedOutput: "Automacao operacional implementada.",
      validationNeeded: false,
      createdAt
    }),
    createPlanningItem({
      id: flowItemId(mission.id, flow, "task", "deliver-operational-infrastructure"),
      missionId: mission.id,
      parentId: deliveryStoryId,
      kind: "task",
      title: "Ship the operational infrastructure support",
      description: "Fecha a habilitacao tecnica do MVP.",
      sector: "technology",
      priority: "high",
      processType: "operational",
      planningStatus: "ready",
      executionStatus: "queued",
      ownerAgentId: getAgentBySlug(directory, "technology-squad").id,
      contextSummary:
        "Infraestrutura precisa sustentar as entregas de landing page e automacao.",
      acceptanceCriteria: [
        "Dependencias tecnicas resolvidas.",
        "Bloqueios de infraestrutura registrados.",
        "Pronto para Quality."
      ],
      dependencies: [
        flowItemId(mission.id, flow, "task", "build-landing-page"),
        flowItemId(
          mission.id,
          flow,
          "task",
          "implement-booking-and-follow-up-automation"
        )
      ],
      inputSummary: "Status consolidado das entregas tecnicas.",
      expectedOutput: "Base operacional pronta para validacao.",
      validationNeeded: false,
      createdAt
    }),
    createPlanningItem({
      id: qualityStoryId,
      missionId: mission.id,
      parentId: epicId,
      kind: "story",
      title: "Run quality gate and prepare the executive decision",
      description: "Executa a passagem por Quality e a decisao final do fluxo.",
      sector: "quality",
      priority: "critical",
      processType: "governance",
      planningStatus: "waiting_validation",
      executionStatus: "queued",
      ownerAgentId: getAgentBySlug(directory, "chief-quality-agent").id,
      contextSummary:
        "Quality e OpenClaw precisam validar a entrega antes do founder decidir o go-live.",
      acceptanceCriteria: [
        "Quality gate registrada.",
        "Handoff Quality -> CEO artificial registrado.",
        "Founder recebe aprovacao final."
      ],
      dependencies: [deliveryStoryId],
      inputSummary: "Entrega tecnica completa.",
      expectedOutput: "Parecer de qualidade e decisao executiva.",
      validationNeeded: true,
      createdAt
    }),
    createPlanningItem({
      id: flowItemId(mission.id, flow, "task", "quality-validation-and-go-live-brief"),
      missionId: mission.id,
      parentId: qualityStoryId,
      kind: "task",
      title: "Run quality validation and prepare the go-live brief",
      description: "Valida o pacote tecnico e produz o briefing final.",
      sector: "quality",
      priority: "critical",
      processType: "governance",
      planningStatus: "waiting_validation",
      executionStatus: "queued",
      ownerAgentId: getAgentBySlug(directory, "chief-quality-agent").id,
      contextSummary:
        "Quality precisa revisar a entrega tecnica antes da decisao de OpenClaw e Vitor.",
      acceptanceCriteria: [
        "Qualidade da landing page validada.",
        "Automacao e infraestrutura revisadas.",
        "Parecer pronto para CEO artificial."
      ],
      dependencies: [
        flowItemId(mission.id, flow, "task", "deliver-operational-infrastructure")
      ],
      inputSummary: "Entregas tecnicas finalizadas.",
      expectedOutput: "Parecer de Quality e briefing de go-live.",
      validationNeeded: true,
      createdAt
    })
  ];
}

function buildFlowHandoffDefinitions(
  missionId: string,
  flow: BusinessFlowKey
) {
  if (flow === "marketing") {
    return [
      {
        taskId: flowItemId(missionId, flow, "task", "manifesto-editorial-brief"),
        originSlug: "openclaw",
        targetSlug: "cmo-agent",
        taskType: "marketing_strategy",
        priority: "high" as const,
        context: { flow, sector: "marketing" },
        input: { artifact: "mission-brief" },
        expectedOutput: "Manifesto editorial e tese de campanha.",
        validationRules: ["must_define_campaign", "must_define_channel"],
        needsValidation: false
      },
      {
        taskId: flowItemId(missionId, flow, "task", "social-script"),
        originSlug: "cmo-agent",
        targetSlug: "marketing-squad",
        taskType: "content_production",
        priority: "high" as const,
        context: { flow, sector: "marketing" },
        input: { artifact: "editorial-calendar" },
        expectedOutput: "Pacote de roteiro, copy e criativo.",
        validationRules: ["must_have_cta", "must_have_campaign_link"],
        needsValidation: false
      },
      {
        taskId: flowItemId(missionId, flow, "task", "brand-review"),
        originSlug: "marketing-squad",
        targetSlug: "brand-guardian",
        taskType: "brand_review",
        priority: "high" as const,
        context: { flow, sector: "brand" },
        input: { artifact: "campaign-package" },
        expectedOutput: "Parecer de Brand.",
        validationRules: ["must_match_brand_voice"],
        needsValidation: true
      },
      {
        taskId: flowItemId(missionId, flow, "task", "approval-package"),
        originSlug: "brand-guardian",
        targetSlug: "openclaw",
        taskType: "publication_approval",
        priority: "high" as const,
        context: { flow, sector: "marketing" },
        input: { artifact: "brand-approved-campaign" },
        expectedOutput: "Decisao final de marketing.",
        validationRules: ["must_have_brand_decision"],
        needsValidation: false
      }
    ];
  }

  if (flow === "sales") {
    return [
      {
        taskId: flowItemId(missionId, flow, "task", "sales-script-and-training-pack"),
        originSlug: "cmo-agent",
        targetSlug: "cro-agent",
        taskType: "sales_enablement",
        priority: "high" as const,
        context: { flow, sector: "sales" },
        input: { source: "marketing-campaign" },
        expectedOutput: "Script comercial e treinamento.",
        validationRules: ["must_reference_campaign"],
        needsValidation: true
      },
      {
        taskId: flowItemId(missionId, flow, "task", "lead-qualification-and-scheduling"),
        originSlug: "cro-agent",
        targetSlug: "sales-squad",
        taskType: "lead_qualification",
        priority: "high" as const,
        context: { flow, sector: "sales" },
        input: { source: "sales-enablement-pack" },
        expectedOutput: "Leads qualificados e agendados.",
        validationRules: ["must_set_lead_status"],
        needsValidation: false
      },
      {
        taskId: flowItemId(
          missionId,
          flow,
          "task",
          "booking-and-follow-up-automation-request"
        ),
        originSlug: "sales-squad",
        targetSlug: "technology-squad",
        taskType: "revenue_ops_support",
        priority: "high" as const,
        context: { flow, sector: "technology" },
        input: { source: "sales-funnel-needs" },
        expectedOutput: "Request tecnico para automacao e assets.",
        validationRules: ["must_include_expected_output"],
        needsValidation: false
      }
    ];
  }

  return [
    {
      taskId: flowItemId(missionId, flow, "task", "landing-page-intake-from-marketing"),
      originSlug: "cmo-agent",
      targetSlug: "cto-agent",
      taskType: "landing_page_request",
      priority: "high" as const,
      context: { flow, sector: "technology" },
      input: { source: "marketing-approval-package" },
      expectedOutput: "Brief tecnico da landing page.",
      validationRules: ["must_include_campaign_context"],
      needsValidation: false
    },
    {
      taskId: flowItemId(
        missionId,
        flow,
        "task",
        "implement-booking-and-follow-up-automation"
      ),
      originSlug: "cro-agent",
      targetSlug: "technology-squad",
      taskType: "automation_request",
      priority: "high" as const,
      context: { flow, sector: "technology" },
      input: { source: "sales-automation-request" },
      expectedOutput: "Automacao implementada para o funil.",
      validationRules: ["must_include_funnel_dependencies"],
      needsValidation: false
    },
    {
      taskId: flowItemId(missionId, flow, "task", "quality-validation-and-go-live-brief"),
      originSlug: "technology-squad",
      targetSlug: "chief-quality-agent",
      taskType: "quality_gate",
      priority: "critical" as const,
      context: { flow, sector: "quality" },
      input: { source: "technical-delivery-package" },
      expectedOutput: "Parecer de Quality.",
      validationRules: ["must_review_delivery_risks"],
      needsValidation: true
    },
    {
      taskId: flowItemId(missionId, flow, "task", "quality-validation-and-go-live-brief"),
      originSlug: "chief-quality-agent",
      targetSlug: "openclaw",
      taskType: "go_live_recommendation",
      priority: "critical" as const,
      context: { flow, sector: "operations" },
      input: { source: "quality-go-live-brief" },
      expectedOutput: "Recomendacao executiva para founder.",
      validationRules: ["must_include_quality_findings"],
      needsValidation: false
    }
  ];
}

function buildFlowApprovalDefinitions(
  missionId: string,
  flow: BusinessFlowKey
) {
  if (flow === "marketing") {
    return [
      {
        planningItemId: flowItemId(missionId, flow, "task", "approval-package"),
        requestedBySlug: "brand-guardian",
        approverSlug: "openclaw",
        approvalType: "publication",
        decisionNotes:
          "Aguardando decisao final do CEO artificial para liberar a campanha."
      }
    ];
  }

  if (flow === "sales") {
    return [
      {
        planningItemId: flowItemId(
          missionId,
          flow,
          "task",
          "closing-follow-up-and-objection-log"
        ),
        requestedBySlug: "sales-squad",
        approverSlug: "cro-agent",
        approvalType: "funnel_review",
        decisionNotes: "Aguardando revisao do CRO sobre o progresso comercial."
      }
    ];
  }

  return [
    {
      planningItemId: missionProjectId(missionId),
      requestedBySlug: "chief-quality-agent",
      approverSlug: "vitor-perin",
      approvalType: "quality_gate",
      decisionNotes: "Aguardando decisao final do founder apos o parecer de Quality."
    }
  ];
}

function buildFlowValidationDefinitions(
  missionId: string,
  flow: BusinessFlowKey
) {
  if (flow === "marketing") {
    return [
      {
        planningItemId: flowItemId(missionId, flow, "task", "brand-review"),
        validatorSlug: "brand-guardian",
        validationType: "brand",
        status: "warning" as const,
        findings: [
          "Brand gate seeded. Aguarda evidencia final do pacote de campanha antes de virar passed."
        ]
      }
    ];
  }

  if (flow === "sales") {
    return [
      {
        planningItemId: flowItemId(
          missionId,
          flow,
          "task",
          "sales-script-and-training-pack"
        ),
        validatorSlug: "cro-agent",
        validationType: "readiness",
        status: "warning" as const,
        findings: [
          "Sales enablement seeded. Aguarda execucao do treinamento e confirmacao de uso no funil."
        ]
      }
    ];
  }

  return [
    {
      planningItemId: flowItemId(
        missionId,
        flow,
        "task",
        "quality-validation-and-go-live-brief"
      ),
      validatorSlug: "chief-quality-agent",
      validationType: "quality",
      status: "warning" as const,
      findings: [
        "Quality gate seeded. Aguarda evidencia de landing page, automacao e infraestrutura antes da aprovacao final."
      ]
    }
  ];
}

function buildGovernanceApprovalDefinitions(
  missionId: string,
  flow: BusinessFlowKey,
  policies: GovernanceGatePolicy[]
) {
  return policies.flatMap((policy) => {
    if (!policy.requestedBySlug || !policy.approverSlug || !policy.approvalType) {
      return [];
    }

    return [
      {
        planningItemId: resolveGovernancePlanningItemId(missionId, flow, policy),
        requestedBySlug: policy.requestedBySlug,
        approverSlug: policy.approverSlug,
        approvalType: policy.approvalType,
        decisionNotes:
          policy.decisionNotesTemplate ||
          "Aguardando decisao de governanca para liberar a entrega."
      }
    ];
  });
}

function buildGovernanceValidationDefinitions(
  missionId: string,
  flow: BusinessFlowKey,
  policies: GovernanceGatePolicy[]
) {
  return policies.flatMap((policy) => {
    if (
      !policy.validatorSlug ||
      !policy.validationType ||
      !policy.initialValidationStatus
    ) {
      return [];
    }

    return [
      {
        planningItemId: resolveGovernancePlanningItemId(missionId, flow, policy),
        validatorSlug: policy.validatorSlug,
        validationType: policy.validationType,
        status: policy.initialValidationStatus,
        findings:
          policy.findingsTemplate.length > 0
            ? [...policy.findingsTemplate]
            : [
                "Gate configurado, aguardando evidencia da entrega antes da decisao final."
              ]
      }
    ];
  });
}

function resolveGovernancePlanningItemId(
  missionId: string,
  flow: BusinessFlowKey,
  policy: GovernanceGatePolicy
): string {
  if (policy.scope === "project") {
    return missionProjectId(missionId);
  }

  if (!policy.taskSlug) {
    throw new Error(
      `Governance gate policy requires taskSlug for task scope: ${policy.key}`
    );
  }

  return flowItemId(missionId, flow, "task", policy.taskSlug);
}

function buildFlowWorkflowDefinitions(
  missionId: string,
  flow: BusinessFlowKey
): Array<{
  planningItemId: string;
  jobName: string;
  status: WorkflowRun["status"];
  startedAt: string;
  finishedAt: string;
}> {
  const now = new Date().toISOString();
  const epicSlug =
    flow === "marketing"
      ? "social-content-engine"
      : flow === "sales"
        ? "sales-enablement-and-funnel"
        : "technology-enablement-and-delivery";

  return [
    {
      planningItemId: flowItemId(missionId, flow, "epic", epicSlug),
      jobName: `flow.bootstrap.${flow}`,
      status: "succeeded",
      startedAt: now,
      finishedAt: now
    }
  ];
}

function buildFlowMemoryDefinitions(
  mission: Mission,
  flow: BusinessFlowKey
): Array<{
  domain: MemoryRecord["domain"];
  title: string;
  summary: string;
  bodyRef: string;
  tags: string[];
  sourceType: MemoryRecord["sourceType"];
  linkedPlanningItemId: string;
}> {
  if (flow === "marketing") {
    return [
      {
        domain: "brand",
        title: `${mission.title} - brand narrative`,
        summary:
          "Narrativa editorial, linguagem e guardrails da campanha de Marketing.",
        bodyRef: `memory://missions/${mission.id}/marketing/brand-narrative`,
        tags: ["sector:marketing", "agent:cmo-agent", "flow:marketing"],
        sourceType: "playbook",
        linkedPlanningItemId: flowItemId(
          mission.id,
          flow,
          "story",
          "manifesto-editorial-and-calendar"
        )
      },
      {
        domain: "offers",
        title: `${mission.title} - campaign offer framing`,
        summary:
          "Resumo da oferta, promessa e CTA usados para alimentar Marketing e Sales.",
        bodyRef: `memory://missions/${mission.id}/marketing/offer-framing`,
        tags: ["sector:marketing", "agent:openclaw", "flow:marketing"],
        sourceType: "decision",
        linkedPlanningItemId: flowItemId(mission.id, flow, "task", "approval-package")
      },
      {
        domain: "operations",
        title: `${mission.title} - marketing operating notes`,
        summary:
          "Resumo operacional do fluxo de Marketing, handoffs e gates de Brand.",
        bodyRef: `memory://missions/${mission.id}/marketing/operations`,
        tags: ["sector:marketing", "agent:marketing-squad", "flow:marketing"],
        sourceType: "delivery",
        linkedPlanningItemId: flowItemId(mission.id, flow, "epic", "social-content-engine")
      }
    ];
  }

  if (flow === "sales") {
    return [
      {
        domain: "sales",
        title: `${mission.title} - sales enablement playbook`,
        summary:
          "Scripts, treinamento e criterios de qualificacao ligados a campanha.",
        bodyRef: `memory://missions/${mission.id}/sales/enablement-playbook`,
        tags: ["sector:sales", "agent:cro-agent", "flow:sales"],
        sourceType: "playbook",
        linkedPlanningItemId: flowItemId(
          mission.id,
          flow,
          "story",
          "training-scripts-and-objection-handling"
        )
      },
      {
        domain: "operations",
        title: `${mission.title} - funnel operating notes`,
        summary:
          "Resumo operacional do funil, dependencia com Marketing e request para Technology.",
        bodyRef: `memory://missions/${mission.id}/sales/operations`,
        tags: ["sector:sales", "agent:sales-squad", "flow:sales"],
        sourceType: "delivery",
        linkedPlanningItemId: flowItemId(
          mission.id,
          flow,
          "epic",
          "sales-enablement-and-funnel"
        )
      }
    ];
  }

  return [
    {
      domain: "technology",
      title: `${mission.title} - technology delivery playbook`,
      summary:
        "Escopo tecnico consolidado para landing pages, automacoes e infraestrutura operacional.",
      bodyRef: `memory://missions/${mission.id}/technology/delivery-playbook`,
      tags: ["sector:technology", "agent:cto-agent", "flow:technology"],
      sourceType: "playbook",
      linkedPlanningItemId: flowItemId(
        mission.id,
        flow,
        "story",
        "landing-pages-automations-and-infrastructure"
      )
    },
    {
      domain: "quality",
      title: `${mission.title} - quality go-live gate`,
      summary:
        "Parecer inicial de Quality para go-live e riscos tecnicos identificados no fluxo.",
      bodyRef: `memory://missions/${mission.id}/technology/quality-gate`,
      tags: ["sector:quality", "agent:chief-quality-agent", "flow:technology"],
      sourceType: "decision",
      linkedPlanningItemId: flowItemId(
        mission.id,
        flow,
        "task",
        "quality-validation-and-go-live-brief"
      )
    },
    {
      domain: "operations",
      title: `${mission.title} - technology operating notes`,
      summary:
        "Resumo operacional do fluxo tecnico, backlog entregue e bloqueios estruturais.",
      bodyRef: `memory://missions/${mission.id}/technology/operations`,
      tags: ["sector:technology", "agent:technology-squad", "flow:technology"],
      sourceType: "delivery",
      linkedPlanningItemId: flowItemId(
        mission.id,
        flow,
        "epic",
        "technology-enablement-and-delivery"
      )
    }
  ];
}

function assertFlowDependencies(
  flow: BusinessFlowKey,
  missionId: string,
  planningItems: PlanningItem[]
): void {
  const itemIds = new Set(planningItems.map((item) => item.id));

  if (
    flow === "sales" &&
    !itemIds.has(flowItemId(missionId, "marketing", "epic", "social-content-engine"))
  ) {
    throw new Error("Sales flow depends on the Marketing flow. Bootstrap marketing first.");
  }

  if (
    flow === "technology" &&
    !itemIds.has(
      flowItemId(missionId, "sales", "epic", "sales-enablement-and-funnel")
    )
  ) {
    throw new Error("Technology flow depends on the Sales flow. Bootstrap sales first.");
  }
}

export function missionProjectId(missionId: string): string {
  return `${missionId}--project--mission-root`;
}

export function flowItemId(
  missionId: string,
  flow: BusinessFlowKey,
  kind: PlanningItem["kind"],
  slug: string
): string {
  return `${missionId}--${flow}--${kind}--${slug}`;
}

function createPlanningItem(input: {
  id: string;
  missionId: string;
  parentId: string | null;
  kind: PlanningItem["kind"];
  title: string;
  description: string;
  sector: PlanningItem["sector"];
  priority: PlanningItem["priority"];
  processType: PlanningItem["processType"];
  planningStatus: PlanningItem["planningStatus"];
  executionStatus: PlanningItem["executionStatus"];
  ownerAgentId: string | null;
  contextSummary: string;
  acceptanceCriteria: string[];
  dependencies?: string[];
  inputSummary: string;
  expectedOutput: string;
  validationNeeded: boolean;
  createdAt: string;
}): PlanningItem {
  return planningItemSchema.parse({
    ...input,
    externalUrl: "",
    updatedAt: input.createdAt
  });
}

function createAgentDirectory(agents: AgentProfile[]): AgentDirectory {
  return {
    byId: new Map(agents.map((agent) => [agent.id, agent])),
    bySlug: new Map(agents.map((agent) => [agent.slug, agent]))
  };
}

function getAgentBySlug(
  directory: AgentDirectory,
  slug: string
): AgentProfile {
  const agent = directory.bySlug.get(slug);

  if (!agent) {
    throw new Error(`Unknown agent slug: ${slug}`);
  }

  return agent;
}

function getAgentById(
  directory: AgentDirectory,
  id: string
): AgentProfile | undefined {
  return directory.byId.get(id);
}

function createAuditEvent(
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
