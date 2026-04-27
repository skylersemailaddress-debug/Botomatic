type RuleResult = { ok: boolean; issues: string[] };

export function validateRepoBuild(input: { installWorks: boolean; buildWorks: boolean }): RuleResult {
  const issues: string[] = [];
  if (!input.installWorks) issues.push("Install does not succeed.");
  if (!input.buildWorks) issues.push("Build does not succeed.");
  return { ok: issues.length === 0, issues };
}
