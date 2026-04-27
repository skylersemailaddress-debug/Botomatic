import assert from "assert";
import fs from "fs";
import path from "path";
import {
  recordAdaptiveRepairOutcome,
  selectAdaptiveRepairStrategy,
  writeAdaptiveRepairMemory,
  readAdaptiveRepairMemory,
  type FailureInspection,
  type RepairAttemptHistory,
} from "../../../autonomous-build/src";

const MEMORY_PATH = path.join(process.cwd(), "release-evidence", "runtime", "repair_strategy_memory.json");

function makeFailure(overrides: Partial<FailureInspection>): FailureInspection {
  return {
    runId: "adaptive_test_run",
    milestoneId: "core_workflows",
    failureCategory: "generated_app_implementation_failure",
    confidence: 0.9,
    evidence: ["build failed"],
    lastError: "TypeScript build failed cannot find module src/workflows/router.ts",
    failingCommand: "npm run -s build",
    affectedFiles: ["release-evidence/generated-apps/proj-test/src/workflows/router.ts"],
    affectedSubsystem: "generated-app-build-loop",
    safeRepairAvailable: true,
    recommendedRepair: "Apply targeted generated-output patch and rerun milestone validators",
    escalationRequired: false,
    resumeCommand: "npm run -s autonomous-build:resume -- adaptive_test_run",
    validationCommandAfterRepair: "validate:core_workflows",
    failureSignature: "sig_import_missing",
    attemptsBySignature: 1,
    attemptsByMilestoneCategory: 1,
    attemptedRepairs: [],
    rejectedStrategies: [],
    priorSimilarOutcomes: [],
    approvalRequired: false,
    expectedValidationCommand: "npm run -s build && npm run -s test:universal",
    rollbackPlan: "Revert generated output files touched in this repair attempt.",
    ...overrides,
  };
}

function select(failure: FailureInspection, repairHistory: RepairAttemptHistory[] = [], selfUpgradeApproved = false) {
  return selectAdaptiveRepairStrategy({
    failureInspection: failure,
    repairHistory,
    selfUpgradeApproved,
  });
}

function testMissingLaunchCapsuleSelectsCompleteLaunchCapsule() {
  const failure = makeFailure({
    milestoneId: "launch_readiness",
    failureCategory: "validation_contract_failure",
    failureSignature: "sig_launch_capsule_missing",
    lastError: "missing launch capsule file launch-capsule/README.md",
    affectedFiles: ["release-evidence/generated-apps/proj-test/launch-capsule/README.md"],
    affectedSubsystem: "launch-capsule",
  });
  const result = select(failure);
  assert.strictEqual(result.primaryStrategy?.strategyId, "complete_launch_capsule");
  assert(
    result.primaryStrategy?.validationCommandAfterRepair.includes("launch_capsule") ||
      result.expectedValidationCommand.includes("launch_capsule"),
    "Expected launch capsule validation command"
  );
  assert(
    result.fallbackStrategies.some((item) => item.strategyId === "add_missing_file") ||
      result.primaryStrategy?.strategyId === "add_missing_file"
  );
}

function testTypescriptMissingImportSelectsFixImport() {
  const result = select(makeFailure({
    failureSignature: "sig_ts_import",
    lastError: "TypeScript build failed cannot find module ./workflowIndex",
  }));
  assert.strictEqual(result.primaryStrategy?.strategyId, "fix_import_or_export");
  assert(
    result.expectedValidationCommand.includes("build") ||
      result.primaryStrategy?.validationCommandAfterRepair.includes("build")
  );
}

function testSameSignatureFailedStrategySuppressed() {
  const failure = makeFailure({ failureSignature: "sig_repeat_failed_import" });
  const history: RepairAttemptHistory[] = [
    {
      milestoneId: failure.milestoneId,
      failureCategory: failure.failureCategory,
      failureSignature: failure.failureSignature,
      strategyId: "fix_import_or_export",
      repairAction: "Correct module import/export paths and index exports in generated output.",
      outcome: "failed",
      reason: "failed",
      attemptedAt: new Date().toISOString(),
    },
  ];

  const result = select(failure, history);
  assert.notStrictEqual(result.primaryStrategy?.strategyId, "fix_import_or_export");
  assert(result.rejectedStrategies.some((item) => item.strategyId === "fix_import_or_export"));
}

function testSuccessfulSimilarStrategyBoosted() {
  recordAdaptiveRepairOutcome({
    failureSignature: "sig_prev_success_1",
    failureCategory: "generated_app_implementation_failure",
    affectedSubsystem: "generated-app-build-loop",
    selectedStrategyId: "fix_import_or_export",
    strategyRisk: "low",
    repairActionSummary: "fix import",
    validationCommand: "npm run -s build",
    validationResult: "passed",
    outcome: "success",
    timestamp: new Date().toISOString(),
    artifactPaths: [],
    filesChanged: ["release-evidence/generated-apps/proj-test/src/workflows/router.ts"],
    rollbackInfo: "revert generated files",
    notes: "worked",
    reverted: false,
  });

  const result = select(makeFailure({
    failureSignature: "sig_prev_success_2",
    lastError: "cannot find module workflow import",
  }));

  assert.strictEqual(result.primaryStrategy?.strategyId, "fix_import_or_export");
}

function testMissingVercelTokenRoutesToVault() {
  const result = select(makeFailure({
    failureCategory: "missing_secret_or_credential",
    failureSignature: "sig_vercel_missing",
    lastError: "Vercel token required",
    safeRepairAvailable: false,
    escalationRequired: true,
    affectedSubsystem: "secrets-workflow",
    affectedFiles: [],
  }));

  assert.strictEqual(result.primaryStrategy?.strategyId, "route_to_vault_setup");
  assert(!/paste .*secret/i.test(result.primaryStrategy?.repairActionDescription || ""));
}

function testExit137SelectsReduceConcurrency() {
  const result = select(makeFailure({
    failureCategory: "resource_limit_failure",
    failureSignature: "sig_137",
    lastError: "process exited with 137 due to memory pressure",
    affectedSubsystem: "runtime",
  }));
  assert.strictEqual(result.primaryStrategy?.strategyId, "reduce_concurrency_and_resume");
}

function testPortConflictSelectsCleanPortRestart() {
  const result = select(makeFailure({
    failureCategory: "resource_limit_failure",
    failureSignature: "sig_port_conflict",
    lastError: "port already in use eaddrinuse",
    affectedSubsystem: "local runtime",
  }));
  assert.strictEqual(result.primaryStrategy?.strategyId, "clean_port_and_restart");
}

function testBuilderDefectRequiresApprovalAndNoSourceMutation() {
  const result = select(makeFailure({
    failureCategory: "botomatic_builder_defect",
    failureSignature: "sig_builder_defect",
    lastError: "routing regression in botomatic builder",
    safeRepairAvailable: false,
    escalationRequired: true,
    affectedSubsystem: "botomatic",
    affectedFiles: ["apps/control-plane/src/components/chat/intentRouting.ts"],
  }), [], false);

  assert.strictEqual(result.primaryStrategy, null);
  assert.strictEqual(result.approvalRequired, true);
  assert(result.rejectedStrategies.some((item) => item.strategyId === "stop_for_builder_defect"));
}

function testHighRiskWithoutApprovalRejected() {
  const result = select(makeFailure({
    failureCategory: "botomatic_builder_defect",
    failureSignature: "sig_high_risk_reject",
    lastError: "builder defect",
    affectedSubsystem: "botomatic",
  }), [], false);

  assert(result.rejectedStrategies.some((item) => item.reason === "high_risk_requires_approval"));
}

function testNoSafeStrategyEscalatesWithQuestion() {
  const failure = makeFailure({
    failureCategory: "missing_human_decision",
    failureSignature: "sig_no_safe_strategy",
    lastError: "human decision needed and no safe default",
    safeRepairAvailable: false,
    escalationRequired: true,
    userQuestion: "Which compliance target should be used?",
    affectedSubsystem: "build-contract",
    affectedFiles: [],
  });

  const result = select(failure);
  assert.strictEqual(result.primaryStrategy, null);
  assert.strictEqual(result.approvalRequired, true);
  assert(result.whyThisStrategy.toLowerCase().includes("required"));
}

function testOutcomeSuccessRecordedAndBoosts() {
  const signature = "sig_success_memory";
  recordAdaptiveRepairOutcome({
    failureSignature: signature,
    failureCategory: "generated_app_implementation_failure",
    affectedSubsystem: "generated-app-build-loop",
    selectedStrategyId: "fix_import_or_export",
    strategyRisk: "low",
    repairActionSummary: "fix import",
    validationCommand: "npm run -s build",
    validationResult: "passed",
    outcome: "success",
    timestamp: new Date().toISOString(),
    artifactPaths: [],
    filesChanged: [],
    rollbackInfo: "revert files",
    notes: "success",
    reverted: false,
  });

  const memory = readAdaptiveRepairMemory();
  assert(memory.records.some((record) => record.failureSignature === signature && record.outcome === "success"));

  const result = select(makeFailure({ failureSignature: "sig_success_memory_similar" }));
  assert.strictEqual(result.primaryStrategy?.strategyId, "fix_import_or_export");
}

function testOutcomeFailureRecordedAndSuppresses() {
  const signature = "sig_failure_memory";
  recordAdaptiveRepairOutcome({
    failureSignature: signature,
    failureCategory: "generated_app_implementation_failure",
    affectedSubsystem: "generated-app-build-loop",
    selectedStrategyId: "fix_import_or_export",
    strategyRisk: "low",
    repairActionSummary: "fix import",
    validationCommand: "npm run -s build",
    validationResult: "failed",
    outcome: "failed",
    timestamp: new Date().toISOString(),
    artifactPaths: [],
    filesChanged: [],
    rollbackInfo: "revert files",
    notes: "failed",
    reverted: false,
  });

  const result = select(makeFailure({ failureSignature: signature }));
  assert.notStrictEqual(result.primaryStrategy?.strategyId, "fix_import_or_export");
  assert(result.rejectedStrategies.some((item) => item.strategyId === "fix_import_or_export"));
}

function run() {
  const hadMemory = fs.existsSync(MEMORY_PATH);
  const backup = hadMemory ? fs.readFileSync(MEMORY_PATH, "utf8") : null;

  writeAdaptiveRepairMemory({ version: 1, updatedAt: new Date().toISOString(), records: [] });

  try {
    testMissingLaunchCapsuleSelectsCompleteLaunchCapsule();
    testTypescriptMissingImportSelectsFixImport();
    testSameSignatureFailedStrategySuppressed();
    testSuccessfulSimilarStrategyBoosted();
    testMissingVercelTokenRoutesToVault();
    testExit137SelectsReduceConcurrency();
    testPortConflictSelectsCleanPortRestart();
    testBuilderDefectRequiresApprovalAndNoSourceMutation();
    testHighRiskWithoutApprovalRejected();
    testNoSafeStrategyEscalatesWithQuestion();
    testOutcomeSuccessRecordedAndBoosts();
    testOutcomeFailureRecordedAndSuppresses();
    console.log("adaptiveRepairStrategy.test.ts passed");
  } finally {
    if (hadMemory && backup !== null) {
      fs.mkdirSync(path.dirname(MEMORY_PATH), { recursive: true });
      fs.writeFileSync(MEMORY_PATH, backup, "utf8");
    } else if (fs.existsSync(MEMORY_PATH)) {
      fs.unlinkSync(MEMORY_PATH);
    }
  }
}

run();
