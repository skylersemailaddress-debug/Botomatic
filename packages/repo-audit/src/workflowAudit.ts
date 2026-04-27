import { AuditResult } from "./repoHealthAudit";

export function workflowAudit(input: { coreWorkflowCount: number }): AuditResult {
  const issues: string[] = [];
  if (input.coreWorkflowCount < 2) issues.push("Core workflows are incomplete.");
  return { ok: issues.length === 0, issues };
}
