type RuleResult = { ok: boolean; issues: string[] };

export function validateWorkflows(spec: any): RuleResult {
  const issues: string[] = [];
  if (!Array.isArray(spec?.workflows) || spec.workflows.length < 2) issues.push("Production workflows are incomplete.");
  return { ok: issues.length === 0, issues };
}
