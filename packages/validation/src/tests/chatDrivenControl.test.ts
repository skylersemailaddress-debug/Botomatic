import assert from "assert";
import { classifyIntent } from "../../../../apps/control-plane/src/components/chat/intentRouting";
import { evaluateSelfUpgradeGuard } from "../../../../apps/control-plane/src/components/chat/selfUpgradeGuard";
import { ACTION_RAIL_COMMANDS } from "../../../../apps/control-plane/src/components/chat/actionRailCommands";
import { buildNextBestAction } from "../../../../apps/control-plane/src/components/chat/nextBestAction";
import { normalizeIntakeContext } from "../../../../apps/control-plane/src/components/chat/intakePipeline";

function testIntentRoutingSuite() {
  assert.strictEqual(classifyIntent("build Nexus from uploaded v11", { uploadedSpecExists: true }), "generated_app_build");
  assert.strictEqual(classifyIntent("validate it"), "validation_proof");
  assert.strictEqual(classifyIntent("what now"), "status_query");
  assert.strictEqual(classifyIntent("fix failed milestone"), "blocker_resolution");
}

function testSelfUpgradeGuard() {
  const blocked = evaluateSelfUpgradeGuard("build Nexus from uploaded v11");
  assert.strictEqual(blocked.allowed, false);
  assert(blocked.reason?.includes("Self-upgrade blocked"), "Guard must explain reroute behavior");

  const requiresConfirm = evaluateSelfUpgradeGuard("upgrade Botomatic validator logic");
  assert.strictEqual(requiresConfirm.allowed, false);
  assert.strictEqual(requiresConfirm.requiresConfirmation, true);

  const allowed = evaluateSelfUpgradeGuard("upgrade Botomatic validator logic and confirm self-upgrade");
  assert.strictEqual(allowed.allowed, true);
  assert.strictEqual(allowed.requiresConfirmation, false);
}

function testGeneratedAppDefaultRouting() {
  assert.strictEqual(classifyIntent("update the UI", { uploadedSpecExists: true }), "generated_app_build");
  assert.strictEqual(classifyIntent("make app better", { uploadedSpecExists: true }), "generated_app_build");
}

function testActiveRunContinueResumeRouting() {
  const context = { activeGeneratedAppRun: true };
  assert.strictEqual(classifyIntent("continue", context), "generated_app_build");
  assert.strictEqual(classifyIntent("resume build", context), "generated_app_build");
  assert.strictEqual(classifyIntent("go", context), "generated_app_build");
}

function testStatusRailActionCommandMapping() {
  assert.strictEqual(ACTION_RAIL_COMMANDS.continue_build, "continue current generated app build");
  assert.strictEqual(ACTION_RAIL_COMMANDS.inspect_failure, "inspect failed milestone and recommend repair");
  assert.strictEqual(ACTION_RAIL_COMMANDS.resolve_blocker, "explain blocker and propose safe default");
  assert.strictEqual(ACTION_RAIL_COMMANDS.validate, "run validate all and summarize proof");
  assert.strictEqual(ACTION_RAIL_COMMANDS.show_proof, "show latest proof and launch readiness");
  assert.strictEqual(ACTION_RAIL_COMMANDS.configure_keys, "show missing secrets and recommended setup");
  assert.strictEqual(ACTION_RAIL_COMMANDS.prepare_deployment, "prepare deployment readiness, no live deployment");
  assert.strictEqual(ACTION_RAIL_COMMANDS.approve_contract, "approve current generated app build contract");
  assert.strictEqual(ACTION_RAIL_COMMANDS.generate_plan, "generate execution plan from uploaded build contract");
}

function testNextBestActionEngine() {
  const action = buildNextBestAction({
    projectStatus: "failed",
    uploadedSpecExists: true,
    buildContractApproved: true,
    approvalStatus: "approved",
    activeRunId: "run_123",
    currentMilestone: "core_workflows",
    completedMilestones: ["intake", "planning"],
    failedMilestone: "core_workflows",
    repairAttempts: 6,
    blockers: ["repair_budget_exhausted"],
    validationStatus: "pending",
    launchGateStatus: "blocked",
    missingSecretsCount: 0,
    proofStatus: "failed",
  });

  assert(action.nextBestAction.includes("inspect failed milestone core_workflows"));
  assert(action.why.toLowerCase().includes("repair budget"));
}

function testUnifiedIntakeNormalization() {
  const context = normalizeIntakeContext({
    sourceType: "github_url",
    value: "https://github.com/acme/nexus",
    suggestedIntent: "generated_app_build",
  });

  assert.strictEqual(context.source_input.sourceType, "github_url");
  assert.strictEqual(context.intake_source.provider, "github");
  assert.strictEqual(context.build_contract_context.seededFromIntake, true);
  assert.strictEqual(context.planning.required, true);
  assert.strictEqual(context.execution.required, true);
}

function testSelfUpgradeRoutingCases() {
  assert.strictEqual(classifyIntent("upgrade Botomatic validator logic"), "self_upgrade");
  assert.strictEqual(classifyIntent("modify Botomatic itself"), "self_upgrade");
  assert.notStrictEqual(classifyIntent("build Nexus from uploaded v11", { uploadedSpecExists: true }), "self_upgrade");
  assert.notStrictEqual(classifyIntent("continue build", { activeGeneratedAppRun: true }), "self_upgrade");
}

function run() {
  testIntentRoutingSuite();
  testSelfUpgradeGuard();
  testGeneratedAppDefaultRouting();
  testActiveRunContinueResumeRouting();
  testStatusRailActionCommandMapping();
  testNextBestActionEngine();
  testUnifiedIntakeNormalization();
  testSelfUpgradeRoutingCases();
  console.log("chatDrivenControl.test.ts passed");
}

run();
