import { AuditResult } from "./repoHealthAudit";

export function securityAudit(input: { hasAuth: boolean; hasRoleGuards: boolean; hasSecretLeaks: boolean }): AuditResult {
  const issues: string[] = [];
  if (!input.hasAuth) issues.push("Auth implementation missing.");
  if (!input.hasRoleGuards) issues.push("Role guards missing.");
  if (input.hasSecretLeaks) issues.push("Secret-like content detected in repo.");
  return { ok: issues.length === 0, issues };
}
