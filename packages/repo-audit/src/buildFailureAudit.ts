import { AuditResult } from "./repoHealthAudit";

export function buildFailureAudit(buildLogs: string): AuditResult {
  const issues: string[] = [];
  const lower = buildLogs.toLowerCase();
  if (lower.includes("error")) issues.push("Build output contains errors.");
  if (lower.includes("cannot find module")) issues.push("Missing module dependencies in build path.");
  return { ok: issues.length === 0, issues };
}
