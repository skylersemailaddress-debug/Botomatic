type RuleResult = { ok: boolean; issues: string[] };

export function validateForms(spec: any): RuleResult {
  const issues: string[] = [];
  if (!Array.isArray(spec?.components) || !spec.components.some((c: string) => c.toLowerCase().includes("form"))) issues.push("Form components are missing.");
  return { ok: issues.length === 0, issues };
}
