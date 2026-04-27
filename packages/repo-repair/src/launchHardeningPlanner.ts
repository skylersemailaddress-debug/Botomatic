export function planLaunchHardening(input: { hasSecurityGaps: boolean; hasDeploymentGaps: boolean }): string[] {
  const actions: string[] = [];
  if (input.hasSecurityGaps) actions.push("Harden auth/RBAC and secret handling");
  if (input.hasDeploymentGaps) actions.push("Add production deployment path and env manifest");
  actions.push("Run full readiness validators and produce launch packet");
  return actions;
}
