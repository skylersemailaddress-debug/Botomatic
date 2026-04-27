import type { FailureInspection } from "./failurePolicy";
import type { RepairAttemptHistory } from "./failurePolicy";
import {
  findSimilarAdaptiveOutcomes,
  summarizeStrategyOutcomesForSignature,
  type AdaptiveRepairOutcome,
} from "./adaptiveRepairMemory";
import {
  REPAIR_STRATEGY_REGISTRY,
  getRepairStrategyById,
  type RepairStrategy,
} from "./repairStrategyRegistry";

export type StrategyRejection = {
  strategyId: string;
  reason: string;
};

export type AdaptiveSelectionResult = {
  primaryStrategy: RepairStrategy | null;
  fallbackStrategies: RepairStrategy[];
  rejectedStrategies: StrategyRejection[];
  confidence: number;
  approvalRequired: boolean;
  expectedValidationCommand: string;
  rollbackPlan: string;
  whyThisStrategy: string;
  priorSimilarOutcomes: Array<{
    strategyId: string;
    outcome: "success" | "failed" | "skipped" | "escalated";
    timestamp: string;
    notes: string;
  }>;
};

export type AdaptiveSelectionInput = {
  failureInspection: FailureInspection;
  repairHistory: RepairAttemptHistory[];
  selfUpgradeApproved: boolean;
};

function riskScore(strategy: RepairStrategy): number {
  if (strategy.riskLevel === "low") return 3;
  if (strategy.riskLevel === "medium") return 2;
  return 1;
}

function strategyApplicableToFailure(strategy: RepairStrategy, failure: FailureInspection): boolean {
  const text = `${failure.lastError} ${failure.failingCommand} ${failure.affectedFiles.join(" ")} ${failure.affectedSubsystem}`.toLowerCase();

  if (!strategy.appliesToCategories.includes(failure.failureCategory)) {
    return false;
  }

  if (
    strategy.appliesToSubsystemPatterns.length > 0 &&
    !strategy.appliesToSubsystemPatterns.some((pattern) => text.includes(pattern.toLowerCase()))
  ) {
    return false;
  }

  if (
    strategy.appliesToFilePatterns.length > 0 &&
    !strategy.appliesToFilePatterns.some((pattern) => text.includes(pattern.toLowerCase()))
  ) {
    return false;
  }

  if (strategy.strategyId === "complete_launch_capsule") {
    return /launch|capsule|packet|checkpoint|milestone|env\.example/.test(text);
  }

  if (strategy.strategyId === "fix_import_or_export") {
    return /import|export|cannot find module|module path|index\./.test(text);
  }

  if (strategy.strategyId === "repair_schema_mismatch") {
    return /schema|migration|entity|response|field/.test(text);
  }

  if (strategy.strategyId === "replace_placeholder_output") {
    return /placeholder|todo|fake integration|coming soon/.test(text);
  }

  if (strategy.strategyId === "split_large_input") {
    return /upload too large|extraction limit|provider unavailable|network|timeout/.test(text);
  }

  if (strategy.strategyId === "reduce_concurrency_and_resume") {
    return /137|out of memory|killed/.test(text);
  }

  if (strategy.strategyId === "clean_port_and_restart") {
    return /port already in use|eaddrinuse/.test(text);
  }

  if (strategy.strategyId === "route_to_vault_setup") {
    return /token|secret|credential|key|vercel|supabase|openai|github/.test(text);
  }

  return true;
}

function computeStrategyScore(input: {
  strategy: RepairStrategy;
  failureInspection: FailureInspection;
  similarOutcomes: AdaptiveRepairOutcome[];
}): number {
  const base = riskScore(input.strategy) * 10;
  const strategyOutcomes = input.similarOutcomes.filter((item) => item.selectedStrategyId === input.strategy.strategyId);
  const successCount = strategyOutcomes.filter((item) => item.outcome === "success").length;
  const failCount = strategyOutcomes.filter((item) => item.outcome === "failed").length;
  const text = `${input.failureInspection.lastError} ${input.failureInspection.affectedFiles.join(" ")}`.toLowerCase();

  let heuristicBoost = 0;
  if (/launch|capsule|packet|checkpoint|env\.example/.test(text) && input.strategy.strategyId === "complete_launch_capsule") {
    heuristicBoost += 8;
  }
  if (/launch|capsule|packet|checkpoint|env\.example/.test(text) && input.strategy.strategyId === "add_missing_file") {
    heuristicBoost += 2;
  }
  if (/cannot find module|import|export|module path|index\./.test(text) && input.strategy.strategyId === "fix_import_or_export") {
    heuristicBoost += 8;
  }
  if (/137|out of memory|killed/.test(text) && input.strategy.strategyId === "reduce_concurrency_and_resume") {
    heuristicBoost += 8;
  }
  if (/port already in use|eaddrinuse/.test(text) && input.strategy.strategyId === "clean_port_and_restart") {
    heuristicBoost += 8;
  }

  return base + successCount * 6 - failCount * 8 + heuristicBoost;
}

export function selectAdaptiveRepairStrategy(input: AdaptiveSelectionInput): AdaptiveSelectionResult {
  const rejected: StrategyRejection[] = [];
  const candidates: RepairStrategy[] = [];
  const failure = input.failureInspection;

  const signatureOutcomeSummary = summarizeStrategyOutcomesForSignature(failure.failureSignature);
  const similarOutcomes = findSimilarAdaptiveOutcomes({
    failureCategory: failure.failureCategory,
    affectedSubsystem: failure.affectedSubsystem,
    failureSignature: failure.failureSignature,
  });

  const attemptedForSignature = new Set(
    input.repairHistory
      .filter((item) => item.failureSignature === failure.failureSignature)
      .map((item) => item.repairAction)
  );

  for (const strategy of REPAIR_STRATEGY_REGISTRY) {
    if (!strategyApplicableToFailure(strategy, failure)) {
      rejected.push({ strategyId: strategy.strategyId, reason: "not_applicable" });
      continue;
    }

    if (strategy.riskLevel === "high" && !input.selfUpgradeApproved) {
      rejected.push({ strategyId: strategy.strategyId, reason: "high_risk_requires_approval" });
      continue;
    }

    if (strategy.allowedTargets.includes("botomatic_source") && !input.selfUpgradeApproved) {
      rejected.push({ strategyId: strategy.strategyId, reason: "botomatic_source_requires_self_upgrade_approval" });
      continue;
    }

    if ((signatureOutcomeSummary[strategy.strategyId]?.failed || 0) > 0) {
      rejected.push({ strategyId: strategy.strategyId, reason: "failed_for_same_signature" });
      continue;
    }

    const strategySimilar = similarOutcomes.filter((item) => item.selectedStrategyId === strategy.strategyId);
    const strategySuccess = strategySimilar.filter((item) => item.outcome === "success").length;
    const strategyFail = strategySimilar.filter((item) => item.outcome === "failed").length;
    if (strategySuccess > 0 && strategyFail > 1) {
      rejected.push({ strategyId: strategy.strategyId, reason: "flapping_repair_pattern_detected" });
      continue;
    }

    if (attemptedForSignature.has(strategy.repairActionDescription)) {
      rejected.push({ strategyId: strategy.strategyId, reason: "already_attempted_for_same_signature" });
      continue;
    }

    candidates.push(strategy);
  }

  const ranked = [...candidates].sort((a, b) => {
    const scoreB = computeStrategyScore({ strategy: b, failureInspection: failure, similarOutcomes });
    const scoreA = computeStrategyScore({ strategy: a, failureInspection: failure, similarOutcomes });
    return scoreB - scoreA;
  });

  const primary = ranked[0] || null;
  const fallback = ranked.slice(1, 4);

  if (!primary) {
    return {
      primaryStrategy: null,
      fallbackStrategies: [],
      rejectedStrategies: rejected,
      confidence: 0.35,
      approvalRequired: true,
      expectedValidationCommand: "inspect_failure_before_continue",
      rollbackPlan: "No safe strategy selected; no automatic file mutation.",
      whyThisStrategy: failure.userQuestion
        ? `Human decision required: ${failure.userQuestion}`
        : "No safe adaptive strategy is available. Human decision required.",
      priorSimilarOutcomes: similarOutcomes.slice(0, 5).map((item) => ({
        strategyId: item.selectedStrategyId,
        outcome: item.outcome,
        timestamp: item.timestamp,
        notes: item.notes,
      })),
    };
  }

  const successfulSimilar = similarOutcomes.filter(
    (item) => item.selectedStrategyId === primary.strategyId && item.outcome === "success"
  ).length;
  const failedSimilar = similarOutcomes.filter(
    (item) => item.selectedStrategyId === primary.strategyId && item.outcome === "failed"
  ).length;

  const confidence = Math.max(0.4, Math.min(0.97, 0.62 + successfulSimilar * 0.08 - failedSimilar * 0.1));

  const why = successfulSimilar > 0
    ? `Selected ${primary.strategyId} because it previously succeeded ${successfulSimilar} time(s) for similar failures and is low risk.`
    : `Selected ${primary.strategyId} as the lowest-risk applicable strategy that has not failed for this signature.`;

  return {
    primaryStrategy: primary,
    fallbackStrategies: fallback,
    rejectedStrategies: rejected,
    confidence,
    approvalRequired: primary.requiresApproval,
    expectedValidationCommand: primary.validationCommandAfterRepair,
    rollbackPlan: primary.rollbackInstructions,
    whyThisStrategy: why,
    priorSimilarOutcomes: similarOutcomes.slice(0, 5).map((item) => ({
      strategyId: item.selectedStrategyId,
      outcome: item.outcome,
      timestamp: item.timestamp,
      notes: item.notes,
    })),
  };
}

export function getStrategiesByIds(ids: string[]): RepairStrategy[] {
  return ids
    .map((id) => getRepairStrategyById(id))
    .filter((strategy): strategy is RepairStrategy => Boolean(strategy));
}
