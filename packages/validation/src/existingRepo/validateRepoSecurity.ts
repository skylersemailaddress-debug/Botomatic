type RuleResult = { ok: boolean; issues: string[] };

export function validateRepoSecurity(input: {
  authReal: boolean;
  roleGuardsReal: boolean;
  fakeAuthOrPaymentOrMessaging: boolean;
}): RuleResult {
  const issues: string[] = [];
  if (!input.authReal) issues.push("Real auth is missing where required.");
  if (!input.roleGuardsReal) issues.push("Role guards are missing where required.");
  if (input.fakeAuthOrPaymentOrMessaging) issues.push("Fake auth/payment/email/SMS detected in production path.");
  return { ok: issues.length === 0, issues };
}
