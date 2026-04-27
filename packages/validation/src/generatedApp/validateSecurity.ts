type RuleResult = { ok: boolean; issues: string[] };

export function validateSecurity(spec: any): RuleResult {
  const issues: string[] = [];
  if (!spec?.authModel) issues.push("Auth model missing.");
  if (!Array.isArray(spec?.securityRequirements) || spec.securityRequirements.length < 1) issues.push("Security requirements missing.");
  return { ok: issues.length === 0, issues };
}
