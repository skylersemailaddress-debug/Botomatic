import { AuditResult } from "./repoHealthAudit";

export function deploymentAudit(input: { hasDeploymentPath: boolean; hasEnvManifest: boolean; hasLaunchReadme: boolean }): AuditResult {
  const issues: string[] = [];
  if (!input.hasDeploymentPath) issues.push("Deployment path missing.");
  if (!input.hasEnvManifest) issues.push("Environment variable manifest missing.");
  if (!input.hasLaunchReadme) issues.push("Launch README missing.");
  return { ok: issues.length === 0, issues };
}
