type RuleResult = { ok: boolean; issues: string[] };

export function validateDataModel(spec: any): RuleResult {
  const issues: string[] = [];
  if (!Array.isArray(spec?.dataEntities) || spec.dataEntities.length < 2) issues.push("Data entities are incomplete.");
  if (!Array.isArray(spec?.relationships) || spec.relationships.length < 1) issues.push("Entity relationships are missing.");
  return { ok: issues.length === 0, issues };
}
