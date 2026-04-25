import { AuditResult } from "./repoHealthAudit";

export function dataModelAudit(input: { requiresData: boolean; hasSchema: boolean; hasPersistenceFlows: boolean }): AuditResult {
  const issues: string[] = [];
  if (input.requiresData && !input.hasSchema) issues.push("Data schema/migrations missing.");
  if (input.requiresData && !input.hasPersistenceFlows) issues.push("Persistence flows are incomplete.");
  return { ok: issues.length === 0, issues };
}
