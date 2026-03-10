import type { AgentProfile, EscalationRecord } from "@gmv/contracts";
import type { RuntimeRepository } from "./index.js";

export async function assertRouteAvailable(
  repository: RuntimeRepository,
  origin: AgentProfile,
  target: AgentProfile
): Promise<void> {
  if (origin.status !== "active") {
    throw new Error(`Origin agent is not active: ${origin.slug}`);
  }

  if (target.status !== "active") {
    throw new Error(`Target agent is not active: ${target.slug}`);
  }

  if (target.actorType === "founder" || target.actorType === "ceo") {
    return;
  }

  const activeCapabilities = await repository.listSectorCapabilities({
    sector: target.sector,
    phase: target.phase
  });

  if (!activeCapabilities.some((capability) => capability.status === "active")) {
    throw new Error(
      `Target sector is not enabled for routing: ${target.sector}`
    );
  }
}

export async function resolveEscalationTarget(
  repository: RuntimeRepository,
  currentTarget: AgentProfile
): Promise<{ target: AgentProfile; level: EscalationRecord["level"] }> {
  const agents = await repository.listAgents();
  const activeAgents = agents.filter((agent) => agent.status === "active");

  if (
    currentTarget.actorType === "worker" ||
    currentTarget.actorType === "specialist" ||
    currentTarget.actorType === "human_operator"
  ) {
    const cLevel = activeAgents.find(
      (agent) =>
        agent.actorType === "c_level" && agent.sector === currentTarget.sector
    );

    if (cLevel) {
      return {
        target: cLevel,
        level: "to_c_level"
      };
    }
  }

  if (
    currentTarget.actorType === "worker" ||
    currentTarget.actorType === "specialist" ||
    currentTarget.actorType === "human_operator" ||
    currentTarget.actorType === "c_level"
  ) {
    const ceo = activeAgents.find((agent) => agent.actorType === "ceo");

    if (ceo) {
      return {
        target: ceo,
        level: "to_ceo"
      };
    }
  }

  if (currentTarget.actorType === "ceo") {
    const preferredFounder =
      activeAgents.find((agent) => agent.slug === "vitor-perin") ??
      activeAgents.find((agent) => agent.actorType === "founder");

    if (preferredFounder) {
      return {
        target: preferredFounder,
        level: "to_founder"
      };
    }
  }

  throw new Error(`No escalation target available for agent: ${currentTarget.slug}`);
}
