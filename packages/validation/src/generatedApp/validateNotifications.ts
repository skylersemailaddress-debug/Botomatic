type RuleResult = { ok: boolean; issues: string[] };

export function validateNotifications(spec: any): RuleResult {
  const issues: string[] = [];
  if (Array.isArray(spec?.notifications) && spec.notifications.length === 0) issues.push("Notification paths are not defined.");
  return { ok: issues.length === 0, issues };
}
