import { createSelfUpgradeSpec, SelfUpgradeSpec } from "./selfUpgradeSpec";

export function mapAffectedModules(request: string): string[] {
  const lower = request.toLowerCase();
  const modules = new Set<string>();
  if (/(validator|validate|quality)/.test(lower)) modules.add("packages/validation");
  if (/(spec|contract|clarify|assumption|recommendation)/.test(lower)) modules.add("packages/spec-engine");
  if (/(blueprint|domain)/.test(lower)) modules.add("packages/blueprints");
  if (/(chat|ui|panel|composer)/.test(lower)) modules.add("apps/control-plane");
  if (/(api|route|orchestrator|worker|execution)/.test(lower)) modules.add("apps/orchestrator-api");
  if (modules.size === 0) modules.add("repository");
  return Array.from(modules);
}

export function planSelfUpgrade(request: string): SelfUpgradeSpec {
  const affectedModules = mapAffectedModules(request);
  return createSelfUpgradeSpec({
    request,
    objective: "Safely upgrade Botomatic behavior while preserving governance and non-regression guarantees.",
    affectedModules,
    targetedValidators: ["module-targeted validators"],
    regressionValidators: ["npm run -s validate:all"],
    rollbackInstructions: ["Revert upgrade commit(s)", "Re-run regression validators"],
  });
}
