type RuleResult = { ok: boolean; issues: string[] };

export function validateResponsiveUi(spec: any): RuleResult {
  const issues: string[] = [];
  if (!Array.isArray(spec?.responsiveRequirements) || spec.responsiveRequirements.length < 1) issues.push("Responsive requirements missing.");
  return { ok: issues.length === 0, issues };
}
