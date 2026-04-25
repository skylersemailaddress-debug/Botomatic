import { SelfUpgradeSpec } from "./selfUpgradeSpec";

export type RegressionGuardResult = {
  ok: boolean;
  blockers: string[];
};

export function runRegressionGuard(spec: SelfUpgradeSpec, validatorExitCode: number): RegressionGuardResult {
  const blockers: string[] = [];
  if (!spec.affectedModules.length) blockers.push("Affected module map is missing.");
  if (validatorExitCode !== 0) blockers.push("Regression validators failed.");
  return { ok: blockers.length === 0, blockers };
}
