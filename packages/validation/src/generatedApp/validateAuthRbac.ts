type RuleResult = { ok: boolean; issues: string[] };

export function validateAuthRbac(spec: any): RuleResult {
  const issues: string[] = [];
  if (!spec?.authModel) issues.push("Auth model is missing.");
  if (!Array.isArray(spec?.roles) || spec.roles.length < 2) issues.push("Multiple roles are required.");
  if (!Array.isArray(spec?.permissions) || spec.permissions.length < 2) issues.push("Permission model is missing.");
  return { ok: issues.length === 0, issues };
}
