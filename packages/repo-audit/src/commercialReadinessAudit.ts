import { AuditResult } from "./repoHealthAudit";

export function commercialReadinessAudit(audits: AuditResult[]): AuditResult {
  const issues = audits.flatMap((audit) => audit.issues);
  return { ok: issues.length === 0, issues };
}
