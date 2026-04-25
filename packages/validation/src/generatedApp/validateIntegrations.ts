type RuleResult = { ok: boolean; issues: string[] };

export function validateIntegrations(spec: any): RuleResult {
  const issues: string[] = [];
  if (!Array.isArray(spec?.integrations) || spec.integrations.length < 1) issues.push("No integrations are defined.");
  return { ok: issues.length === 0, issues };
}
