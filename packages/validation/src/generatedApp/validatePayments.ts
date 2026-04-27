type RuleResult = { ok: boolean; issues: string[] };

export function validatePayments(spec: any): RuleResult {
  const issues: string[] = [];
  if (Array.isArray(spec?.payments) && spec.payments.length > 0 && !spec.pricingModel) issues.push("Payments are declared without pricing model.");
  return { ok: issues.length === 0, issues };
}
