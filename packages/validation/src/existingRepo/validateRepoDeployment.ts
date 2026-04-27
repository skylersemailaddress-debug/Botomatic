type RuleResult = { ok: boolean; issues: string[] };

export function validateRepoDeployment(input: {
  deploymentPathReal: boolean;
  envManifestExists: boolean;
  launchReadmeExists: boolean;
}): RuleResult {
  const issues: string[] = [];
  if (!input.deploymentPathReal) issues.push("Real deployment path missing.");
  if (!input.envManifestExists) issues.push("Environment variable manifest missing.");
  if (!input.launchReadmeExists) issues.push("Launch README missing.");
  return { ok: issues.length === 0, issues };
}
