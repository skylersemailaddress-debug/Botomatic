import assert from "assert";
import {
  createFailureSignature,
  evaluateRepairPolicy,
  normalizeErrorMessage,
} from "../../../autonomous-build/src/failurePolicy";
import { runAutonomousRepairLoop } from "../../../autonomous-build/src/autonomousRepairLoop";
import type { AutonomousBuildRunState } from "../../../autonomous-build/src/checkpointStore";
import { classifyIntent } from "../../../../apps/control-plane/src/components/chat/intentRouting";

function baseRunState(): AutonomousBuildRunState {
  return {
    runId: "run_failure_policy_test",
    status: "running",
    milestoneGraph: [],
    checkpoint: {
      runId: "run_failure_policy_test",
      currentMilestone: "core_workflows",
      completedMilestones: ["intake", "planning"],
      failedMilestone: "core_workflows",
      repairAttempts: 1,
      repairAttemptsBySignature: {},
      repairAttemptsByMilestoneCategory: {},
      repairHistory: [],
      lastFailure: null,
      artifactPaths: [],
      logs: [],
      resumeCommand: "npm run -s autonomous-build:resume -- run_failure_policy_test",
      nextAction: "inspect failed milestone core_workflows",
    },
    humanBlockers: [],
    startedAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    finalReleaseAssembled: false,
  };
}

function testTypeScriptGeneratedFailureClassification() {
  const policy = evaluateRepairPolicy({
    failure: {
      milestoneId: "core_workflows",
      failureCode: "build_failed",
      failureDetail: "TypeScript build failed in generated app output",
      failingCommand: "npm run build",
      affectedFiles: ["release-evidence/generated-apps/proj-x/src/workflows/router.ts"],
    },
    attemptedRepairs: [],
    affectedFiles: ["release-evidence/generated-apps/proj-x/src/workflows/router.ts"],
  });
  assert.strictEqual(policy.category, "generated_app_implementation_failure");
}

function testMissingLaunchCapsuleClassification() {
  const policy = evaluateRepairPolicy({
    failure: {
      milestoneId: "launch_readiness",
      failureCode: "validator_failed",
      failureDetail: "missing launch capsule file",
      failingCommand: "npm run -s validate:launch",
      affectedFiles: ["release-evidence/generated-apps/proj-x/launch-capsule/manifest.json"],
    },
    attemptedRepairs: [],
    affectedFiles: ["release-evidence/generated-apps/proj-x/launch-capsule/manifest.json"],
  });
  assert.strictEqual(policy.category, "validation_contract_failure");
}

function testConflictingSpecClassification() {
  const policy = evaluateRepairPolicy({
    failure: {
      milestoneId: "planning",
      failureCode: "spec_conflict",
      failureDetail: "conflicting requirements for auth and compliance target",
      failingCommand: "generate plan",
      affectedFiles: [],
    },
    attemptedRepairs: [],
    affectedFiles: [],
  });
  assert.strictEqual(policy.category, "build_contract_ambiguity");
}

function testBuildNexusRoutingRegressionGuard() {
  assert.notStrictEqual(classifyIntent("build Nexus from uploaded v11", { uploadedSpecExists: true }), "self_upgrade");

  const policy = evaluateRepairPolicy({
    failure: {
      milestoneId: "routing",
      failureCode: "routing_regression",
      failureDetail: "build Nexus routed to self-upgrade",
      failingCommand: "classify intent",
      affectedFiles: ["apps/control-plane/src/components/chat/intentRouting.ts"],
    },
    attemptedRepairs: [],
    affectedFiles: ["apps/control-plane/src/components/chat/intentRouting.ts"],
  });
  assert.strictEqual(policy.category, "botomatic_builder_defect");
}

function testMissingVercelTokenClassification() {
  const policy = evaluateRepairPolicy({
    failure: {
      milestoneId: "deployment",
      failureCode: "missing_token",
      failureDetail: "Vercel token required for provider action",
      failingCommand: "prepare deployment",
      affectedFiles: [],
    },
    attemptedRepairs: [],
    affectedFiles: [],
  });
  assert.strictEqual(policy.category, "missing_secret_or_credential");
}

function testExit137Classification() {
  const policy = evaluateRepairPolicy({
    failure: {
      milestoneId: "core_workflows",
      failureCode: "process_killed",
      failureDetail: "process exited with 137",
      failingCommand: "npm run test",
      affectedFiles: [],
    },
    attemptedRepairs: [],
    affectedFiles: [],
  });
  assert.strictEqual(policy.category, "resource_limit_failure");
}

function testRepeatedSignatureStopsBlindRetry() {
  const runState = baseRunState();
  const failingCommand = "npm run build";
  const failureDetail = "TypeScript build failed in generated app output";
  const normalized = normalizeErrorMessage(failureDetail);
  const signature = createFailureSignature({
    milestoneId: "core_workflows",
    failingCommand,
    normalizedError: normalized,
    affectedFiles: ["release-evidence/generated-apps/proj-x/src/workflows/router.ts"],
    validatorOrProofName: "validate:core_workflows",
  });

  runState.checkpoint.repairAttemptsBySignature[signature] = 1;
  runState.checkpoint.repairAttemptsByMilestoneCategory["core_workflows:generated_app_implementation_failure"] = 1;
  runState.checkpoint.repairHistory.push({
    milestoneId: "core_workflows",
    failureCategory: "generated_app_implementation_failure",
    failureSignature: signature,
    repairAction: "Apply targeted generated-output patch and rerun milestone validators",
    outcome: "failed",
    reason: "Same fix already attempted",
    attemptedAt: new Date().toISOString(),
  });

  const attempt = runAutonomousRepairLoop({
    runState,
    milestoneId: "core_workflows",
    failureCode: "build_failed",
    failureDetail,
    failingCommand,
    affectedFiles: ["release-evidence/generated-apps/proj-x/src/workflows/router.ts"],
    affectedSubsystem: "generated-app-build-loop",
    validatorOrProofName: "validate:core_workflows",
    repairBudget: 3,
  });

  assert.strictEqual(attempt.repaired, false);
  assert.strictEqual(attempt.failureInspection.failureSignature, signature);
  assert(attempt.failureInspection.repairBudgetExhausted, "Expected repair_budget_exhausted payload");
  assert(attempt.failureInspection.repairBudgetExhausted?.attemptedRepairs.length, "Expected attempted repair history");
  assert(attempt.failureInspection.repairBudgetExhausted?.exactNextAction.includes("inspect failed milestone"));
}

function testGeneratedOutputAutoRepairPolicy() {
  const policy = evaluateRepairPolicy({
    failure: {
      milestoneId: "core_workflows",
      failureCode: "build_failed",
      failureDetail: "generated route import missing",
      failingCommand: "npm run build",
      affectedFiles: ["release-evidence/generated-apps/proj-y/src/workflows/router.ts"],
    },
    attemptedRepairs: [],
    affectedFiles: ["release-evidence/generated-apps/proj-y/src/workflows/router.ts"],
  });
  assert.strictEqual(policy.category, "generated_app_implementation_failure");
  assert.strictEqual(policy.autoRepairAllowed, true);
}

function testBuilderDefectCannotAutoRepair() {
  const policy = evaluateRepairPolicy({
    failure: {
      milestoneId: "routing",
      failureCode: "builder_defect",
      failureDetail: "validator expects obsolete file marker",
      failingCommand: "dispatch",
      affectedFiles: ["packages/validation/src/repoValidators.ts"],
    },
    attemptedRepairs: [],
    affectedFiles: ["packages/validation/src/repoValidators.ts"],
  });
  assert.strictEqual(policy.category, "botomatic_builder_defect");
  assert.strictEqual(policy.autoRepairAllowed, false);
  assert.strictEqual(policy.escalationRequired, true);
}

function run() {
  testTypeScriptGeneratedFailureClassification();
  testMissingLaunchCapsuleClassification();
  testConflictingSpecClassification();
  testBuildNexusRoutingRegressionGuard();
  testMissingVercelTokenClassification();
  testExit137Classification();
  testRepeatedSignatureStopsBlindRetry();
  testGeneratedOutputAutoRepairPolicy();
  testBuilderDefectCannotAutoRepair();
  console.log("failureClassificationPolicy.test.ts passed");
}

run();
