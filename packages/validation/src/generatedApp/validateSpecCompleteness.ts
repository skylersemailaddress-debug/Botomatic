type RuleResult = { ok: boolean; issues: string[] };

export function validateSpecCompleteness(spec: any): RuleResult {
  const issues: string[] = [];
  if (!spec) issues.push("Spec is missing.");
  if (!spec?.appName) issues.push("Spec missing appName.");
  if (!spec?.coreOutcome) issues.push("Spec missing coreOutcome.");
  if (!Array.isArray(spec?.pages) || spec.pages.length < 2) issues.push("Spec pages are incomplete.");
  if (!Array.isArray(spec?.workflows) || spec.workflows.length < 2) issues.push("Spec workflows are incomplete.");
  if (!Array.isArray(spec?.roles) || spec.roles.length < 2) issues.push("Spec roles are incomplete.");
  return { ok: issues.length === 0, issues };
}
