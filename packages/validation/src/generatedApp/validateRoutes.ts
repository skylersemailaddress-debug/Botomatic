type RuleResult = { ok: boolean; issues: string[] };

export function validateRoutes(spec: any): RuleResult {
  const issues: string[] = [];
  if (!Array.isArray(spec?.pages) || spec.pages.length < 2) issues.push("Routes/pages are incomplete.");
  return { ok: issues.length === 0, issues };
}
