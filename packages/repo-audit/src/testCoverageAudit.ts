import { AuditResult } from "./repoHealthAudit";

export function testCoverageAudit(input: { hasTests: boolean; coveragePct?: number }): AuditResult {
  const issues: string[] = [];
  if (!input.hasTests) issues.push("No test suite detected.");
  if (typeof input.coveragePct === "number" && input.coveragePct < 50) issues.push("Coverage is shallow for commercial readiness.");
  return { ok: issues.length === 0, issues };
}
