import { SelfUpgradeSpec } from "./selfUpgradeSpec";
import {
  createSelfUpgradeSafetyContract,
  deriveRegressionStateFromCommandMetadata,
  type SelfUpgradeMutationMode,
  type SelfUpgradeSafetyContract,
} from "./selfUpgradeContract";

export type RegressionGuardResult = {
  ok: boolean;
  blockers: string[];
  safetyContract: SelfUpgradeSafetyContract;
};

export function runRegressionGuard(input: {
  spec: SelfUpgradeSpec;
  validatorCommand?: string | null;
  validatorExitCode?: number | null;
  targetBranch: string;
  mutationMode: SelfUpgradeMutationMode;
  validatorWeakeningDetected?: boolean;
  driftDetected?: boolean;
  driftReasons?: string[];
}): RegressionGuardResult {
  const blockers: string[] = [];
  if (!input.spec.affectedModules.length) blockers.push("Affected module map is missing.");

  const safetyContract = createSelfUpgradeSafetyContract({
    mutationMode: input.mutationMode,
    targetBranch: input.targetBranch,
    driftCheck: {
      driftDetected: Boolean(input.driftDetected),
      reasons: input.driftReasons || [],
    },
    regressionState: deriveRegressionStateFromCommandMetadata({
      command: input.validatorCommand,
      exitCode: input.validatorExitCode,
    }),
    validatorWeakeningDetected: Boolean(input.validatorWeakeningDetected),
  });

  blockers.push(...safetyContract.blockers);
  return { ok: blockers.length === 0, blockers, safetyContract };
}
