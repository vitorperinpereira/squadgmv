import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import type {
  AgentProfile,
  AgentOnboarding,
  ApprovalDecision,
  AuditEvent,
  EscalationRecord,
  ExecutiveReportSnapshot,
  GovernanceGatePolicy,
  Handoff,
  MemoryRecord,
  Mission,
  OptimizationInitiative,
  PlanningItem,
  SectorCapability,
  ValidationResult,
  WorkflowRun
} from "@gmv/contracts";
import type { RuntimeRepository } from "@gmv/domain";

type RuntimeState = {
  agents: AgentProfile[];
  missions: Mission[];
  planningItems: PlanningItem[];
  handoffs: Handoff[];
  approvals: ApprovalDecision[];
  validations: ValidationResult[];
  workflowRuns: WorkflowRun[];
  executiveReportSnapshots: ExecutiveReportSnapshot[];
  memoryRecords: MemoryRecord[];
  optimizationInitiatives: OptimizationInitiative[];
  sectorCapabilities: SectorCapability[];
  agentOnboarding: AgentOnboarding[];
  governanceGatePolicies: GovernanceGatePolicy[];
  escalationRecords: EscalationRecord[];
  auditEvents: AuditEvent[];
};

const defaultState = (): RuntimeState => ({
  agents: [],
  missions: [],
  planningItems: [],
  handoffs: [],
  approvals: [],
  validations: [],
  workflowRuns: [],
  executiveReportSnapshots: [],
  memoryRecords: [],
  optimizationInitiatives: [],
  sectorCapabilities: [],
  agentOnboarding: [],
  governanceGatePolicies: [],
  escalationRecords: [],
  auditEvents: []
});

export class FileRuntimeRepository implements RuntimeRepository {
  private state: RuntimeState = defaultState();

  constructor(private readonly filePath: string) {}

  async initialize(): Promise<void> {
    await mkdir(path.dirname(this.filePath), { recursive: true });

    try {
      const file = await readFile(this.filePath, "utf8");
      const parsed = JSON.parse(file) as Partial<RuntimeState>;
      this.state = {
        ...defaultState(),
        ...parsed
      };
    } catch {
      this.state = defaultState();
      await this.persist();
    }
  }

  async seedAgents(agents: AgentProfile[]): Promise<void> {
    const existing = new Map(this.state.agents.map((agent) => [agent.slug, agent]));

    for (const agent of agents) {
      if (!existing.has(agent.slug)) {
        this.state.agents.push(agent);
      }
    }

    await this.persist();
  }

  async upsertAgent(agent: AgentProfile): Promise<AgentProfile> {
    const index = this.state.agents.findIndex(
      (candidate) => candidate.slug === agent.slug || candidate.id === agent.id
    );

    if (index === -1) {
      this.state.agents.push(agent);
    } else {
      this.state.agents[index] = {
        ...this.state.agents[index],
        ...agent
      };
    }

    await this.persist();
    return this.state.agents[index === -1 ? this.state.agents.length - 1 : index];
  }

  async listAgents(): Promise<AgentProfile[]> {
    return [...this.state.agents];
  }

  async getAgentBySlug(slug: string): Promise<AgentProfile | undefined> {
    return this.state.agents.find((agent) => agent.slug === slug);
  }

  async getAgentById(id: string): Promise<AgentProfile | undefined> {
    return this.state.agents.find((agent) => agent.id === id);
  }

  async createMission(mission: Mission): Promise<Mission> {
    this.state.missions.push(mission);
    await this.persist();
    return mission;
  }

  async updateMission(missionId: string, patch: Partial<Mission>): Promise<Mission> {
    const index = this.state.missions.findIndex((mission) => mission.id === missionId);

    if (index === -1) {
      throw new Error(`Mission not found: ${missionId}`);
    }

    this.state.missions[index] = {
      ...this.state.missions[index],
      ...patch
    };
    await this.persist();
    return this.state.missions[index];
  }

  async getMission(missionId: string): Promise<Mission | undefined> {
    return this.state.missions.find((mission) => mission.id === missionId);
  }

  async listMissions(): Promise<Mission[]> {
    return [...this.state.missions];
  }

  async upsertPlanningItems(items: PlanningItem[]): Promise<PlanningItem[]> {
    for (const item of items) {
      const index = this.state.planningItems.findIndex(
        (existing) => existing.id === item.id
      );

      if (index === -1) {
        this.state.planningItems.push(item);
      } else {
        this.state.planningItems[index] = {
          ...this.state.planningItems[index],
          ...item
        };
      }
    }

    await this.persist();
    return items;
  }

  async listPlanningItems(filter?: {
    missionId?: string;
    kind?: PlanningItem["kind"];
  }): Promise<PlanningItem[]> {
    return this.state.planningItems.filter((item) => {
      if (filter?.missionId && item.missionId !== filter.missionId) {
        return false;
      }

      if (filter?.kind && item.kind !== filter.kind) {
        return false;
      }

      return true;
    });
  }

  async getPlanningItem(id: string): Promise<PlanningItem | undefined> {
    return this.state.planningItems.find((item) => item.id === id);
  }

  async createHandoff(handoff: Handoff): Promise<Handoff> {
    this.state.handoffs.push(handoff);
    await this.persist();
    return handoff;
  }

  async updateHandoff(
    handoffId: string,
    patch: Partial<Handoff>
  ): Promise<Handoff> {
    const index = this.state.handoffs.findIndex((handoff) => handoff.id === handoffId);

    if (index === -1) {
      throw new Error(`Handoff not found: ${handoffId}`);
    }

    this.state.handoffs[index] = {
      ...this.state.handoffs[index],
      ...patch
    };
    await this.persist();
    return this.state.handoffs[index];
  }

  async getHandoff(handoffId: string): Promise<Handoff | undefined> {
    return this.state.handoffs.find((handoff) => handoff.id === handoffId);
  }

  async listHandoffs(): Promise<Handoff[]> {
    return [...this.state.handoffs];
  }

  async createApproval(approval: ApprovalDecision): Promise<ApprovalDecision> {
    this.state.approvals.push(approval);
    await this.persist();
    return approval;
  }

  async updateApproval(
    approvalId: string,
    patch: Partial<ApprovalDecision>
  ): Promise<ApprovalDecision> {
    const index = this.state.approvals.findIndex(
      (approval) => approval.id === approvalId
    );

    if (index === -1) {
      throw new Error(`Approval not found: ${approvalId}`);
    }

    this.state.approvals[index] = {
      ...this.state.approvals[index],
      ...patch
    };
    await this.persist();
    return this.state.approvals[index];
  }

  async getApproval(approvalId: string): Promise<ApprovalDecision | undefined> {
    return this.state.approvals.find((approval) => approval.id === approvalId);
  }

  async listApprovals(): Promise<ApprovalDecision[]> {
    return [...this.state.approvals];
  }

  async createValidation(result: ValidationResult): Promise<ValidationResult> {
    this.state.validations.push(result);
    await this.persist();
    return result;
  }

  async listValidations(): Promise<ValidationResult[]> {
    return [...this.state.validations];
  }

  async createWorkflowRun(run: WorkflowRun): Promise<WorkflowRun> {
    this.state.workflowRuns.push(run);
    await this.persist();
    return run;
  }

  async listWorkflowRuns(filter?: {
    missionId?: string;
    status?: WorkflowRun["status"];
  }): Promise<WorkflowRun[]> {
    if (!filter?.missionId && !filter?.status) {
      return [...this.state.workflowRuns];
    }

    const missionPlanningItemIds = filter?.missionId
      ? new Set(
          this.state.planningItems
            .filter((item) => item.missionId === filter.missionId)
            .map((item) => item.id)
        )
      : undefined;

    return this.state.workflowRuns.filter((run) => {
      if (filter?.status && run.status !== filter.status) {
        return false;
      }

      if (
        missionPlanningItemIds &&
        (!run.planningItemId || !missionPlanningItemIds.has(run.planningItemId))
      ) {
        return false;
      }

      return true;
    });
  }

  async saveExecutiveReportSnapshot(
    snapshot: ExecutiveReportSnapshot
  ): Promise<ExecutiveReportSnapshot> {
    const index = this.state.executiveReportSnapshots.findIndex(
      (candidate) => candidate.id === snapshot.id
    );

    if (index === -1) {
      this.state.executiveReportSnapshots.push(snapshot);
    } else {
      this.state.executiveReportSnapshots[index] = snapshot;
    }

    await this.persist();
    return snapshot;
  }

  async listExecutiveReportSnapshots(filter?: {
    limit?: number;
  }): Promise<ExecutiveReportSnapshot[]> {
    const snapshots = [...this.state.executiveReportSnapshots].sort((left, right) =>
      right.createdAt.localeCompare(left.createdAt)
    );

    if (!filter?.limit || filter.limit <= 0) {
      return snapshots;
    }

    return snapshots.slice(0, filter.limit);
  }

  async saveMemoryRecord(record: MemoryRecord): Promise<MemoryRecord> {
    const index = this.state.memoryRecords.findIndex(
      (candidate) => candidate.id === record.id
    );

    if (index === -1) {
      this.state.memoryRecords.push(record);
    } else {
      this.state.memoryRecords[index] = record;
    }

    await this.persist();
    return record;
  }

  async listMemoryRecords(filter?: {
    domain?: MemoryRecord["domain"];
    missionId?: string;
    tag?: string;
  }): Promise<MemoryRecord[]> {
    return this.state.memoryRecords.filter((record) => {
      if (filter?.domain && record.domain !== filter.domain) {
        return false;
      }

      if (filter?.missionId && record.linkedMissionId !== filter.missionId) {
        return false;
      }

      if (filter?.tag && !record.tags.includes(filter.tag)) {
        return false;
      }

      return true;
    });
  }

  async createOptimizationInitiative(
    initiative: OptimizationInitiative
  ): Promise<OptimizationInitiative> {
    this.state.optimizationInitiatives.push(initiative);
    await this.persist();
    return initiative;
  }

  async updateOptimizationInitiative(
    initiativeId: string,
    patch: Partial<OptimizationInitiative>
  ): Promise<OptimizationInitiative> {
    const index = this.state.optimizationInitiatives.findIndex(
      (initiative) => initiative.id === initiativeId
    );

    if (index === -1) {
      throw new Error(`Optimization initiative not found: ${initiativeId}`);
    }

    this.state.optimizationInitiatives[index] = {
      ...this.state.optimizationInitiatives[index],
      ...patch
    };
    await this.persist();
    return this.state.optimizationInitiatives[index];
  }

  async getOptimizationInitiative(
    initiativeId: string
  ): Promise<OptimizationInitiative | undefined> {
    return this.state.optimizationInitiatives.find(
      (initiative) => initiative.id === initiativeId
    );
  }

  async listOptimizationInitiatives(filter?: {
    missionId?: string;
    sector?: string;
    flowKey?: string;
    status?: OptimizationInitiative["status"];
  }): Promise<OptimizationInitiative[]> {
    return this.state.optimizationInitiatives.filter((initiative) => {
      if (filter?.missionId && initiative.linkedMissionId !== filter.missionId) {
        return false;
      }

      if (filter?.sector && initiative.sector !== filter.sector) {
        return false;
      }

      if (filter?.flowKey && initiative.flowKey !== filter.flowKey) {
        return false;
      }

      if (filter?.status && initiative.status !== filter.status) {
        return false;
      }

      return true;
    });
  }

  async createSectorCapability(
    capability: SectorCapability
  ): Promise<SectorCapability> {
    this.state.sectorCapabilities.push(capability);
    await this.persist();
    return capability;
  }

  async listSectorCapabilities(filter?: {
    sector?: string;
    phase?: SectorCapability["phase"];
  }): Promise<SectorCapability[]> {
    return this.state.sectorCapabilities.filter((capability) => {
      if (filter?.sector && capability.sector !== filter.sector) {
        return false;
      }

      if (filter?.phase && capability.phase !== filter.phase) {
        return false;
      }

      return true;
    });
  }

  async createAgentOnboarding(
    record: AgentOnboarding
  ): Promise<AgentOnboarding> {
    this.state.agentOnboarding.push(record);
    await this.persist();
    return record;
  }

  async listAgentOnboarding(filter?: {
    sector?: string;
    phase?: AgentOnboarding["targetPhase"];
    status?: AgentOnboarding["status"];
  }): Promise<AgentOnboarding[]> {
    return this.state.agentOnboarding.filter((record) => {
      if (filter?.sector && record.sector !== filter.sector) {
        return false;
      }

      if (filter?.phase && record.targetPhase !== filter.phase) {
        return false;
      }

      if (filter?.status && record.status !== filter.status) {
        return false;
      }

      return true;
    });
  }

  async createGovernanceGatePolicy(
    policy: GovernanceGatePolicy
  ): Promise<GovernanceGatePolicy> {
    const index = this.state.governanceGatePolicies.findIndex(
      (candidate) => candidate.key === policy.key || candidate.id === policy.id
    );

    if (index === -1) {
      this.state.governanceGatePolicies.push(policy);
      await this.persist();
      return policy;
    }

    this.state.governanceGatePolicies[index] = {
      ...this.state.governanceGatePolicies[index],
      ...policy
    };
    await this.persist();
    return this.state.governanceGatePolicies[index];
  }

  async listGovernanceGatePolicies(filter?: {
    flowKey?: GovernanceGatePolicy["flowKey"];
    stage?: GovernanceGatePolicy["stage"];
    active?: boolean;
  }): Promise<GovernanceGatePolicy[]> {
    return this.state.governanceGatePolicies.filter((policy) => {
      if (filter?.flowKey && policy.flowKey !== filter.flowKey) {
        return false;
      }

      if (filter?.stage && policy.stage !== filter.stage) {
        return false;
      }

      if (typeof filter?.active === "boolean" && policy.active !== filter.active) {
        return false;
      }

      return true;
    });
  }

  async createEscalationRecord(
    record: EscalationRecord
  ): Promise<EscalationRecord> {
    this.state.escalationRecords.push(record);
    await this.persist();
    return record;
  }

  async listEscalationRecords(filter?: {
    handoffId?: string;
    status?: EscalationRecord["status"];
  }): Promise<EscalationRecord[]> {
    return this.state.escalationRecords.filter((record) => {
      if (filter?.handoffId && record.handoffId !== filter.handoffId) {
        return false;
      }

      if (filter?.status && record.status !== filter.status) {
        return false;
      }

      return true;
    });
  }

  async appendAuditEvent(event: AuditEvent): Promise<void> {
    this.state.auditEvents.push(event);
    await this.persist();
  }

  async listAuditEvents(filter?: { aggregateId?: string }): Promise<AuditEvent[]> {
    return this.state.auditEvents.filter((event) => {
      if (filter?.aggregateId) {
        return event.aggregateId === filter.aggregateId;
      }

      return true;
    });
  }

  private async persist(): Promise<void> {
    await writeFile(this.filePath, JSON.stringify(this.state, null, 2), "utf8");
  }
}
