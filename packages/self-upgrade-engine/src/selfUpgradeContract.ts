export type SelfUpgradeMutationMode = "pr_only" | "read_only_proof";

export type SelfUpgradeRegressionState =
  | { status: "passed"; source: "validator_command"; command: string; exitCode: 0 }
  | { status: "failed"; source: "validator_command"; command: string; exitCode: number }
  | { status: "indeterminate"; source: "unavailable"; reason: string };

export type SelfUpgradeDriftCheck = {
  driftDetected: boolean;
  reasons: string[];
};

export type SelfUpgradeBranchSafety = {
  targetBranch: string;
  targetBranchIsMain: boolean;
  prScopedChangesRequired: true;
  directMainMutationProhibited: true;
  humanApprovalRequiredBeforeMerge: true;
};

export type SelfUpgradeSafetyContract = {
  mutationMode: SelfUpgradeMutationMode;
  branchSafety: SelfUpgradeBranchSafety;
  validatorWeakeningProhibited: true;
  regressionState: SelfUpgradeRegressionState;
  driftCheck: SelfUpgradeDriftCheck;
  blockers: string[];
  allowed: boolean;
};

export function deriveRegressionStateFromCommandMetadata(input: {
  command?: string | null;
  exitCode?: number | null;
}): SelfUpgradeRegressionState {
  if (!input.command || typeof input.exitCode !== "number") {
    return {
      status: "indeterminate",
      source: "unavailable",
      reason: "Validator command metadata is unavailable.",
    };
  }
  if (input.exitCode === 0) {
    return {
      status: "passed",
      source: "validator_command",
      command: input.command,
      exitCode: 0,
    };
  }
  return {
    status: "failed",
    source: "validator_command",
    command: input.command,
    exitCode: input.exitCode,
  };
}

export function createSelfUpgradeSafetyContract(input: {
  mutationMode: SelfUpgradeMutationMode;
  targetBranch: string;
  driftCheck: SelfUpgradeDriftCheck;
  regressionState: SelfUpgradeRegressionState;
  validatorWeakeningDetected: boolean;
}): SelfUpgradeSafetyContract {
  const targetBranch = input.targetBranch.trim();
  const targetBranchIsMain = targetBranch === "main";
  const blockers: string[] = [];

  if (targetBranchIsMain) blockers.push("Target branch must not be main.");
  if (input.mutationMode !== "pr_only" && input.mutationMode !== "read_only_proof") {
    blockers.push("Mutation mode is invalid.");
  }
  if (input.validatorWeakeningDetected) blockers.push("Validator weakening is prohibited.");
  if (input.driftCheck.driftDetected) blockers.push(...input.driftCheck.reasons);
  if (input.regressionState.status === "failed") blockers.push("Regression validators failed.");
  if (input.regressionState.status === "indeterminate") blockers.push("Regression state is indeterminate; command metadata required.");

  return {
    mutationMode: input.mutationMode,
    branchSafety: {
      targetBranch,
      targetBranchIsMain,
      prScopedChangesRequired: true,
      directMainMutationProhibited: true,
      humanApprovalRequiredBeforeMerge: true,
    },
    validatorWeakeningProhibited: true,
    regressionState: input.regressionState,
    driftCheck: input.driftCheck,
    blockers,
    allowed: blockers.length === 0,
  };
}
