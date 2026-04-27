type RuleResult = { ok: boolean; issues: string[] };

export function validateDeployment(spec: any): RuleResult {
  const issues: string[] = [];
  if (!spec?.deploymentTarget) issues.push("Deployment target missing.");
  if (!Array.isArray(spec?.envVars) || spec.envVars.length < 1) issues.push("Env var manifest missing.");
  return { ok: issues.length === 0, issues };
}
