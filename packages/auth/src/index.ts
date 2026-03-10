export const missionCreatorRoles = new Set([
  "founder",
  "technical_lead",
  "operator"
]);

export const approvalDecisionRoles = new Set([
  "founder",
  "technical_lead",
  "quality_reviewer",
  "ceo_orchestrator"
]);

export function canCreateMission(role: string): boolean {
  return missionCreatorRoles.has(role);
}

export function canDecideApproval(role: string): boolean {
  return approvalDecisionRoles.has(role);
}

export function resolveRoleFromHeaders(
  headers: Record<string, string | string[] | undefined>
): string {
  const roleHeader = headers["x-gmv-role"];

  if (Array.isArray(roleHeader)) {
    return roleHeader[0] ?? "operator";
  }

  return roleHeader ?? "operator";
}
