type RuleResult = { ok: boolean; issues: string[] };

export function validateUxStates(spec: any): RuleResult {
  const issues: string[] = [];
  const hasStates = Array.isArray(spec?.components) && ["loading", "empty", "error"].every((s) => spec.components.some((c: string) => c.toLowerCase().includes(s)));
  if (!hasStates) issues.push("Loading/empty/error UX states missing.");
  return { ok: issues.length === 0, issues };
}
