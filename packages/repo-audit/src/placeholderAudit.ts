import { AuditResult } from "./repoHealthAudit";

export function placeholderAudit(sourceText: string): AuditResult {
  const lower = sourceText.toLowerCase();
  const tokens = ["todo", "fixme", "placeholder", "mock", "stub", "coming soon", "lorem ipsum", "not implemented"];
  const issues = tokens.filter((token) => lower.includes(token)).map((token) => `Placeholder token detected: ${token}`);
  return { ok: issues.length === 0, issues };
}
