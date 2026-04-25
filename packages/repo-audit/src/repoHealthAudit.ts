export type AuditResult = { ok: boolean; issues: string[] };

export function repoHealthAudit(input: {
  installOk: boolean;
  buildOk: boolean;
  testOk: boolean;
}): AuditResult {
  const issues: string[] = [];
  if (!input.installOk) issues.push("Install failed.");
  if (!input.buildOk) issues.push("Build failed.");
  if (!input.testOk) issues.push("Tests failed.");
  return { ok: issues.length === 0, issues };
}
