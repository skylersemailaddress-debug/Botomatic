import crypto from "crypto";

export type FailureCategory =
  | "generated_app_implementation_failure"
  | "build_contract_ambiguity"
  | "botomatic_builder_defect"
  | "missing_human_decision"
  | "missing_secret_or_credential"
  | "external_provider_unavailable"
  | "validation_contract_failure"
  | "resource_limit_failure";

export type FailureInspection = {
  runId: string;
  milestoneId: string;
  failureCategory: FailureCategory;
  confidence: number;
  evidence: string[];
  lastError: string;
  failingCommand: string;
  affectedFiles: string[];
  affectedSubsystem: string;
  safeRepairAvailable: boolean;
  recommendedRepair: string;
  escalationRequired: boolean;
  userQuestion?: string;
  resumeCommand: string;
  validationCommandAfterRepair: string;
  failureSignature: string;
  attemptsBySignature: number;
  attemptsByMilestoneCategory: number;
  attemptedRepairs: string[];
  recommendedStrategyId?: string;
  recommendedStrategyName?: string;
  whyThisStrategy?: string;
  rejectedStrategies: Array<{ strategyId: string; reason: string }>;
  priorSimilarOutcomes: Array<{
    strategyId: string;
    outcome: "success" | "failed" | "skipped" | "escalated";
    timestamp: string;
    notes: string;
  }>;
  approvalRequired: boolean;
  expectedValidationCommand: string;
  rollbackPlan: string;
  repairBudgetExhausted?: {
    whatFailed: string;
    attemptedRepairs: string[];
    whyRepairsFailed: string;
    exactNextAction: string;
  };
};

export type RepairAttemptHistory = {
  milestoneId: string;
  failureCategory: FailureCategory;
  failureSignature: string;
  strategyId?: string;
  repairAction: string;
  outcome: "repaired" | "failed" | "skipped";
  reason: string;
  attemptedAt: string;
};

export type FailureClassifierInput = {
  milestoneId: string;
  failureCode: string;
  failureDetail: string;
  failingCommand: string;
  affectedFiles?: string[];
  affectedSubsystem?: string;
  validatorOrProofName?: string;
};

export type RepairPolicyDecision = {
  category: FailureCategory;
  confidence: number;
  evidence: string[];
  safeRepairAvailable: boolean;
  recommendedRepair: string;
  escalationRequired: boolean;
  userQuestion?: string;
  maxAttemptsPerMilestone: number;
  autoRepairAllowed: boolean;
  safeDefaultApplied?: string;
  retryTransient: boolean;
};

export function normalizeErrorMessage(input: string): string {
  return String(input || "")
    .toLowerCase()
    .replace(/[0-9]{2,}/g, "<n>")
    .replace(/\s+/g, " ")
    .trim();
}

export function createFailureSignature(input: {
  milestoneId: string;
  failingCommand: string;
  normalizedError: string;
  affectedFiles: string[];
  validatorOrProofName?: string;
}): string {
  const raw = [
    input.milestoneId,
    input.failingCommand || "",
    input.normalizedError,
    [...(input.affectedFiles || [])].sort().join("|"),
    input.validatorOrProofName || "",
  ].join("::");
  return crypto.createHash("sha256").update(raw).digest("hex").slice(0, 16);
}

function classifyFailureCategory(input: FailureClassifierInput): {
  category: FailureCategory;
  confidence: number;
  evidence: string[];
} {
  const text = `${input.failureCode} ${input.failureDetail} ${input.failingCommand} ${(input.affectedFiles || []).join(" ")}`.toLowerCase();
  const evidence: string[] = [];

  if (
    /(token|api key|credential|secret|vercel|supabase|openai|github private repo|missing env)/.test(text)
  ) {
    evidence.push("Missing credential/secret indicators detected.");
    return { category: "missing_secret_or_credential", confidence: 0.96, evidence };
  }

  if (/(provider unavailable|network|econn|timeout|dns|service unavailable|502|503|504)/.test(text)) {
    evidence.push("External provider/network availability failure indicators detected.");
    return { category: "external_provider_unavailable", confidence: 0.9, evidence };
  }

  if (/(exit 137|killed|out of memory|port already in use|upload too large|extraction limit)/.test(text)) {
    evidence.push("Resource limit indicators detected.");
    return { category: "resource_limit_failure", confidence: 0.93, evidence };
  }

  if (
    /(no-placeholder|proof artifact missing|final evidence inconsistent|launch capsule malformed|validator failed|validation failed|missing launch capsule|env\.example missing)/.test(
      text
    )
  ) {
    evidence.push("Validation contract failure indicators detected.");
    return { category: "validation_contract_failure", confidence: 0.9, evidence };
  }

  if (/(ambiguous|contradictory|conflicting requirement|unspecified|missing product decision|unclear)/.test(text)) {
    evidence.push("Spec/build contract ambiguity indicators detected.");
    return { category: "build_contract_ambiguity", confidence: 0.91, evidence };
  }

  if (/(approval needed|human decision|compliance target unresolved|destructive rewrite approval|paid provider action)/.test(text)) {
    evidence.push("Explicit human decision requirement indicators detected.");
    return { category: "missing_human_decision", confidence: 0.9, evidence };
  }

  if (
    /(intent misclassification|wrong route selected|validator expects obsolete|proof harness cannot read|writes into botomatic source|dispatches wrong flow|routing regression|routing_regression|builder defect|self-upgrade)/.test(
      text
    )
  ) {
    evidence.push("Botomatic machinery defect indicators detected.");
    return { category: "botomatic_builder_defect", confidence: 0.95, evidence };
  }

  evidence.push("Generated-output implementation failure indicators used as default classification.");
  return { category: "generated_app_implementation_failure", confidence: 0.78, evidence };
}

function isGeneratedOrLaunchCapsulePath(filePath: string): boolean {
  const value = String(filePath || "").toLowerCase();
  return (
    value.includes("release-evidence/generated-apps") ||
    value.includes("generated-app") ||
    value.includes("launch-capsule") ||
    value.includes("launch_packet") ||
    value.includes("launch-package")
  );
}

export function evaluateRepairPolicy(input: {
  failure: FailureClassifierInput;
  attemptedRepairs: string[];
  affectedFiles: string[];
}): RepairPolicyDecision {
  const classification = classifyFailureCategory(input.failure);

  if (classification.category === "generated_app_implementation_failure") {
    const safeTargets = input.affectedFiles.length === 0 || input.affectedFiles.every(isGeneratedOrLaunchCapsulePath);
    return {
      ...classification,
      safeRepairAvailable: safeTargets,
      recommendedRepair: safeTargets
        ? "Apply targeted generated-output patch and rerun milestone validators"
        : "Inspect failure: affected files are outside generated output/launch capsule",
      escalationRequired: !safeTargets,
      maxAttemptsPerMilestone: 3,
      autoRepairAllowed: safeTargets,
      retryTransient: false,
    };
  }

  if (classification.category === "build_contract_ambiguity") {
    const canApplySafeDefault = /(auth model unspecified|deployment target unclear|default region)/.test(
      `${input.failure.failureCode} ${input.failure.failureDetail}`.toLowerCase()
    );
    return {
      ...classification,
      safeRepairAvailable: canApplySafeDefault,
      recommendedRepair: canApplySafeDefault
        ? "Apply documented safe default and record assumption"
        : "Ask one precise clarifying question before continuing",
      escalationRequired: !canApplySafeDefault,
      userQuestion: canApplySafeDefault
        ? undefined
        : "One product decision is required: which auth/deployment/compliance option should be used for this milestone?",
      maxAttemptsPerMilestone: 1,
      autoRepairAllowed: canApplySafeDefault,
      safeDefaultApplied: canApplySafeDefault ? "documented_safe_default" : undefined,
      retryTransient: false,
    };
  }

  if (classification.category === "botomatic_builder_defect") {
    return {
      ...classification,
      safeRepairAvailable: false,
      recommendedRepair: "Stop and report builder defect with module evidence; require approval before self-upgrade",
      escalationRequired: true,
      userQuestion: "Approve self-upgrade investigation for this builder defect?",
      maxAttemptsPerMilestone: 1,
      autoRepairAllowed: false,
      retryTransient: false,
    };
  }

  if (classification.category === "missing_human_decision") {
    return {
      ...classification,
      safeRepairAvailable: false,
      recommendedRepair: "Pause and request exact decision with recommendation",
      escalationRequired: true,
      userQuestion: "A human decision is required for this milestone. Confirm the decision so execution can resume.",
      maxAttemptsPerMilestone: 1,
      autoRepairAllowed: false,
      retryTransient: false,
    };
  }

  if (classification.category === "missing_secret_or_credential") {
    return {
      ...classification,
      safeRepairAvailable: false,
      recommendedRepair: "Block live/provider step, continue non-secret local work, and request Vault-based credential setup",
      escalationRequired: true,
      userQuestion:
        "Required credentials are missing. Configure them via Vault path/secret manager; do not paste plaintext secrets into chat.",
      maxAttemptsPerMilestone: 1,
      autoRepairAllowed: false,
      retryTransient: false,
    };
  }

  if (classification.category === "external_provider_unavailable") {
    return {
      ...classification,
      safeRepairAvailable: true,
      recommendedRepair: "Retry once if transient; otherwise route to alternate intake/provider setup",
      escalationRequired: false,
      maxAttemptsPerMilestone: 2,
      autoRepairAllowed: true,
      retryTransient: true,
    };
  }

  if (classification.category === "validation_contract_failure") {
    return {
      ...classification,
      safeRepairAvailable: true,
      recommendedRepair:
        "Inspect output-vs-validator ownership; auto-repair generated output when output-side, escalate validator contradiction when validator-side",
      escalationRequired: false,
      maxAttemptsPerMilestone: 3,
      autoRepairAllowed: true,
      retryTransient: false,
    };
  }

  if (classification.category === "resource_limit_failure") {
    return {
      ...classification,
      safeRepairAvailable: true,
      recommendedRepair:
        "Apply resource-aware repair (port cleanup/restart, lower concurrency, split work, upload manifest fallback) and retry safely",
      escalationRequired: false,
      maxAttemptsPerMilestone: 3,
      autoRepairAllowed: true,
      retryTransient: false,
    };
  }

  return {
    ...classification,
    safeRepairAvailable: true,
    recommendedRepair:
      "Apply resource-aware repair (port cleanup, reduced concurrency, split work, or alternate intake path) and retry safely",
    escalationRequired: false,
    maxAttemptsPerMilestone: 3,
    autoRepairAllowed: true,
    retryTransient: false,
  };
}

export function buildFailureInspection(input: {
  runId: string;
  resumeCommand: string;
  failure: FailureClassifierInput;
  policy: RepairPolicyDecision;
  failureSignature: string;
  attemptsBySignature: number;
  attemptsByMilestoneCategory: number;
  attemptedRepairs: string[];
  lastError: string;
  validationCommandAfterRepair: string;
  adaptiveSelection?: {
    recommendedStrategyId?: string;
    recommendedStrategyName?: string;
    whyThisStrategy?: string;
    rejectedStrategies: Array<{ strategyId: string; reason: string }>;
    priorSimilarOutcomes: Array<{
      strategyId: string;
      outcome: "success" | "failed" | "skipped" | "escalated";
      timestamp: string;
      notes: string;
    }>;
    approvalRequired: boolean;
    expectedValidationCommand: string;
    rollbackPlan: string;
  };
  budgetExhausted?: {
    whatFailed: string;
    attemptedRepairs: string[];
    whyRepairsFailed: string;
    exactNextAction: string;
  };
}): FailureInspection {
  return {
    runId: input.runId,
    milestoneId: input.failure.milestoneId,
    failureCategory: input.policy.category,
    confidence: input.policy.confidence,
    evidence: input.policy.evidence,
    lastError: input.lastError,
    failingCommand: input.failure.failingCommand,
    affectedFiles: input.failure.affectedFiles || [],
    affectedSubsystem: input.failure.affectedSubsystem || "generated-app-build-loop",
    safeRepairAvailable: input.policy.safeRepairAvailable,
    recommendedRepair: input.policy.recommendedRepair,
    escalationRequired: input.policy.escalationRequired,
    userQuestion: input.policy.userQuestion,
    resumeCommand: input.resumeCommand,
    validationCommandAfterRepair: input.validationCommandAfterRepair,
    failureSignature: input.failureSignature,
    attemptsBySignature: input.attemptsBySignature,
    attemptsByMilestoneCategory: input.attemptsByMilestoneCategory,
    attemptedRepairs: input.attemptedRepairs,
    recommendedStrategyId: input.adaptiveSelection?.recommendedStrategyId,
    recommendedStrategyName: input.adaptiveSelection?.recommendedStrategyName,
    whyThisStrategy: input.adaptiveSelection?.whyThisStrategy,
    rejectedStrategies: input.adaptiveSelection?.rejectedStrategies || [],
    priorSimilarOutcomes: input.adaptiveSelection?.priorSimilarOutcomes || [],
    approvalRequired: input.adaptiveSelection?.approvalRequired || false,
    expectedValidationCommand: input.adaptiveSelection?.expectedValidationCommand || input.validationCommandAfterRepair,
    rollbackPlan: input.adaptiveSelection?.rollbackPlan || "Revert files touched in this repair attempt.",
    repairBudgetExhausted: input.budgetExhausted,
  };
}
