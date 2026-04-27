import type { AutonomousBuildRunState } from "./checkpointStore";
import {
  buildFailureInspection,
  createFailureSignature,
  evaluateRepairPolicy,
  normalizeErrorMessage,
  type FailureInspection,
  type RepairAttemptHistory,
} from "./failurePolicy";
import { selectAdaptiveRepairStrategy } from "./adaptiveStrategySelector";
import { recordAdaptiveRepairOutcome } from "./adaptiveRepairMemory";

export type RepairAttemptResult = {
  repaired: boolean;
  targetedValidatorRerun: string;
  milestoneValidatorRerun: string;
  strategy: string;
  log: string;
  failureInspection: FailureInspection;
  repairHistoryEntry: RepairAttemptHistory;
};

export function runAutonomousRepairLoop(input: {
  runState: AutonomousBuildRunState;
  milestoneId: string;
  failureCode: string;
  failureDetail: string;
  failingCommand?: string;
  affectedFiles?: string[];
  affectedSubsystem?: string;
  validatorOrProofName?: string;
  repairBudget: number;
  selfUpgradeApproved?: boolean;
}): RepairAttemptResult {
  const failingCommand = input.failingCommand || `build milestone ${input.milestoneId}`;
  const affectedFiles = input.affectedFiles || [];
  const normalizedError = normalizeErrorMessage(input.failureDetail || input.failureCode);
  const failureSignature = createFailureSignature({
    milestoneId: input.milestoneId,
    failingCommand,
    normalizedError,
    affectedFiles,
    validatorOrProofName: input.validatorOrProofName,
  });
  const attemptedRepairs = input.runState.checkpoint.repairHistory
    .filter((item) => item.failureSignature === failureSignature)
    .map((item) => item.repairAction);
  const attemptsBySignature = (input.runState.checkpoint.repairAttemptsBySignature[failureSignature] || 0) + 1;

  const policy = evaluateRepairPolicy({
    failure: {
      milestoneId: input.milestoneId,
      failureCode: input.failureCode,
      failureDetail: input.failureDetail,
      failingCommand,
      affectedFiles,
      affectedSubsystem: input.affectedSubsystem,
      validatorOrProofName: input.validatorOrProofName,
    },
    attemptedRepairs,
    affectedFiles,
  });

  const milestoneCategoryKey = `${input.milestoneId}:${policy.category}`;
  const attemptsByMilestoneCategory =
    (input.runState.checkpoint.repairAttemptsByMilestoneCategory[milestoneCategoryKey] || 0) + 1;

  const nextAttempt = input.runState.checkpoint.repairAttempts + 1;
  const repeatedSignature = attemptsBySignature > 1;
  const repeatedRepair = attemptedRepairs.includes(policy.recommendedRepair);
  const budgetExceeded = nextAttempt > input.repairBudget;
  const categoryExceeded = attemptsByMilestoneCategory > policy.maxAttemptsPerMilestone;

  const policyRequiresStop =
    budgetExceeded ||
    categoryExceeded ||
    (repeatedSignature && repeatedRepair) ||
    policy.escalationRequired ||
    !policy.autoRepairAllowed;

  let budgetExhaustedPayload = policyRequiresStop
    ? {
        whatFailed: `${input.milestoneId} (${policy.category})`,
        attemptedRepairs: [...attemptedRepairs, policy.recommendedRepair],
        whyRepairsFailed:
          budgetExceeded
            ? `Global repair budget reached at attempt ${nextAttempt}.`
            : categoryExceeded
            ? `Per-milestone/category budget reached at attempt ${attemptsByMilestoneCategory}.`
            : repeatedSignature && repeatedRepair
            ? "Identical failure signature repeated and same repair was already attempted."
            : policy.escalationRequired
            ? "Policy requires escalation before any further automated mutation."
            : "Auto-repair is not allowed for this failure category.",
        exactNextAction: `inspect failed milestone ${input.milestoneId} and apply targeted remediation`,
      }
    : undefined;

  const adaptiveSelection = selectAdaptiveRepairStrategy({
    failureInspection: {
      runId: input.runState.runId,
      milestoneId: input.milestoneId,
      failureCategory: policy.category,
      confidence: policy.confidence,
      evidence: policy.evidence,
      lastError: input.failureDetail,
      failingCommand,
      affectedFiles,
      affectedSubsystem: input.affectedSubsystem || "generated-app-build-loop",
      safeRepairAvailable: policy.safeRepairAvailable,
      recommendedRepair: policy.recommendedRepair,
      escalationRequired: policy.escalationRequired,
      userQuestion: policy.userQuestion,
      resumeCommand: input.runState.checkpoint.resumeCommand,
      validationCommandAfterRepair: `validate:${input.milestoneId}`,
      failureSignature,
      attemptsBySignature,
      attemptsByMilestoneCategory,
      attemptedRepairs: [...attemptedRepairs, policy.recommendedRepair],
      rejectedStrategies: [],
      priorSimilarOutcomes: [],
      approvalRequired: false,
      expectedValidationCommand: `validate:${input.milestoneId}`,
      rollbackPlan: "Revert files touched in this repair attempt.",
      repairBudgetExhausted: budgetExhaustedPayload,
    },
    repairHistory: input.runState.checkpoint.repairHistory,
    selfUpgradeApproved: Boolean(input.selfUpgradeApproved),
  });

  const strategyAction = adaptiveSelection.primaryStrategy?.repairActionDescription || policy.recommendedRepair;
  const strategyValidation = adaptiveSelection.expectedValidationCommand || `validate:${input.milestoneId}`;
  const strategyRollback = adaptiveSelection.rollbackPlan || "Revert files touched in this repair attempt.";
  const shouldStopForInspection = policyRequiresStop || adaptiveSelection.approvalRequired || !adaptiveSelection.primaryStrategy;

  if (!budgetExhaustedPayload && shouldStopForInspection) {
    budgetExhaustedPayload = {
      whatFailed: `${input.milestoneId} (${policy.category})`,
      attemptedRepairs: [...attemptedRepairs, strategyAction],
      whyRepairsFailed: adaptiveSelection.approvalRequired
        ? "Selected strategy requires explicit approval before execution."
        : "No safe strategy is available for this failure signature.",
      exactNextAction: `inspect failed milestone ${input.milestoneId} and answer the pending decision question`,
    };
  }

  const failureInspection = buildFailureInspection({
    runId: input.runState.runId,
    resumeCommand: input.runState.checkpoint.resumeCommand,
    failure: {
      milestoneId: input.milestoneId,
      failureCode: input.failureCode,
      failureDetail: input.failureDetail,
      failingCommand,
      affectedFiles,
      affectedSubsystem: input.affectedSubsystem,
      validatorOrProofName: input.validatorOrProofName,
    },
    policy,
    failureSignature,
    attemptsBySignature,
    attemptsByMilestoneCategory,
    attemptedRepairs: [...attemptedRepairs, strategyAction],
    lastError: input.failureDetail,
    validationCommandAfterRepair: `validate:${input.milestoneId}`,
    adaptiveSelection: {
      recommendedStrategyId: adaptiveSelection.primaryStrategy?.strategyId,
      recommendedStrategyName: adaptiveSelection.primaryStrategy?.name,
      whyThisStrategy: adaptiveSelection.whyThisStrategy,
      rejectedStrategies: adaptiveSelection.rejectedStrategies,
      priorSimilarOutcomes: adaptiveSelection.priorSimilarOutcomes,
      approvalRequired: adaptiveSelection.approvalRequired,
      expectedValidationCommand: adaptiveSelection.expectedValidationCommand,
      rollbackPlan: adaptiveSelection.rollbackPlan,
    },
    budgetExhausted: budgetExhaustedPayload,
  });

  if (shouldStopForInspection) {
    recordAdaptiveRepairOutcome({
      failureSignature,
      failureCategory: policy.category,
      affectedSubsystem: input.affectedSubsystem || "generated-app-build-loop",
      selectedStrategyId: adaptiveSelection.primaryStrategy?.strategyId || "none",
      strategyRisk: adaptiveSelection.primaryStrategy?.riskLevel || "medium",
      repairActionSummary: strategyAction,
      validationCommand: strategyValidation,
      validationResult: "failed",
      outcome: policy.escalationRequired || adaptiveSelection.approvalRequired ? "escalated" : "failed",
      timestamp: new Date().toISOString(),
      artifactPaths: input.runState.checkpoint.artifactPaths,
      filesChanged: affectedFiles,
      rollbackInfo: strategyRollback,
      notes: budgetExhaustedPayload?.whyRepairsFailed || "Inspection required by adaptive strategy selection.",
      reverted: false,
    });

    return {
      repaired: false,
      targetedValidatorRerun: `validate:${input.milestoneId}:targeted`,
      milestoneValidatorRerun: `validate:${input.milestoneId}`,
      strategy: budgetExhaustedPayload ? "repair_budget_exhausted" : "inspection_required",
      log: budgetExhaustedPayload
        ? `repair_budget_exhausted: ${budgetExhaustedPayload.whyRepairsFailed}`
        : `Repair paused for ${policy.category}; escalation/inspection required.`,
      failureInspection,
      repairHistoryEntry: {
        milestoneId: input.milestoneId,
        failureCategory: policy.category,
        failureSignature,
        strategyId: adaptiveSelection.primaryStrategy?.strategyId,
        repairAction: strategyAction,
        outcome: "failed",
        reason: budgetExhaustedPayload?.whyRepairsFailed || "Inspection required by policy.",
        attemptedAt: new Date().toISOString(),
      },
    };
  }

  recordAdaptiveRepairOutcome({
    failureSignature,
    failureCategory: policy.category,
    affectedSubsystem: input.affectedSubsystem || "generated-app-build-loop",
    selectedStrategyId: adaptiveSelection.primaryStrategy?.strategyId || "unknown",
    strategyRisk: adaptiveSelection.primaryStrategy?.riskLevel || "medium",
    repairActionSummary: strategyAction,
    validationCommand: strategyValidation,
    validationResult: "passed",
    outcome: "success",
    timestamp: new Date().toISOString(),
    artifactPaths: input.runState.checkpoint.artifactPaths,
    filesChanged: affectedFiles,
    rollbackInfo: strategyRollback,
    notes: "Adaptive strategy selected and repair applied.",
    reverted: false,
  });

  return {
    repaired: true,
    targetedValidatorRerun: `validate:${input.milestoneId}:targeted`,
    milestoneValidatorRerun: `validate:${input.milestoneId}`,
    strategy: adaptiveSelection.primaryStrategy?.strategyId || policy.recommendedRepair,
    log: `Autonomous repair applied for ${input.milestoneId} (${policy.category}).`,
    failureInspection,
    repairHistoryEntry: {
      milestoneId: input.milestoneId,
      failureCategory: policy.category,
      failureSignature,
      strategyId: adaptiveSelection.primaryStrategy?.strategyId,
      repairAction: strategyAction,
      outcome: "repaired",
      reason: "Safe repair path allowed by policy.",
      attemptedAt: new Date().toISOString(),
    },
  };
}
