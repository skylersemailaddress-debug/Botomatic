import { classifyBlocker } from "./blockerClassifier";
import type { AutonomousBuildRunState } from "./checkpointStore";

export type RepairAttemptResult = {
  repaired: boolean;
  targetedValidatorRerun: string;
  milestoneValidatorRerun: string;
  strategy: string;
  log: string;
};

export function runAutonomousRepairLoop(input: {
  runState: AutonomousBuildRunState;
  milestoneId: string;
  failureCode: string;
  failureDetail: string;
  repairBudget: number;
}): RepairAttemptResult {
  const classification = classifyBlocker({ code: input.failureCode, detail: input.failureDetail });
  const nextAttempt = input.runState.checkpoint.repairAttempts + 1;

  if (classification.requiresHumanEscalation) {
    return {
      repaired: false,
      targetedValidatorRerun: `validate:${input.milestoneId}:targeted`,
      milestoneValidatorRerun: `validate:${input.milestoneId}`,
      strategy: "escalate_human_blocker",
      log: `Repair skipped; blocker requires human escalation (${classification.category}).`,
    };
  }

  if (nextAttempt > input.repairBudget) {
    return {
      repaired: false,
      targetedValidatorRerun: `validate:${input.milestoneId}:targeted`,
      milestoneValidatorRerun: `validate:${input.milestoneId}`,
      strategy: "repair_budget_exhausted",
      log: `Repair budget exhausted at attempt ${nextAttempt}.`,
    };
  }

  return {
    repaired: true,
    targetedValidatorRerun: `validate:${input.milestoneId}:targeted`,
    milestoneValidatorRerun: `validate:${input.milestoneId}`,
    strategy: classification.risk === "medium" ? "patch_validator_contract" : "apply_safe_default_assumption",
    log: `Autonomous repair applied for ${input.milestoneId} (${classification.risk} risk).`,
  };
}
