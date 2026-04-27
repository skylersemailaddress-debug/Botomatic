import assert from "assert";
import fs from "fs";
import os from "os";
import path from "path";
import { validateChatFirstOperatorRouting } from "../repoValidators";

type FixtureOptions = {
  badRouterExport?: boolean;
  inferredSelfUpgrade?: boolean;
  missingRailMapping?: boolean;
};

function write(root: string, rel: string, content: string) {
  const target = path.join(root, rel);
  fs.mkdirSync(path.dirname(target), { recursive: true });
  fs.writeFileSync(target, content);
}

function createFixture(options: FixtureOptions = {}): string {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), "botomatic-chat-routing-validator-"));

  write(root, "apps/orchestrator-api/src/server_app.ts", "app.post('/operator/send'); formatOperatorVoice(); hasUncompiledIntake(); hasLaunchIntent();");

  write(
    root,
    "apps/control-plane/src/components/chat/ConversationPane.tsx",
    "executeCanonicalCommand(); buildPartnerEnvelope(); function handleFileUpload() {}"
  );

  write(
    root,
    "apps/control-plane/src/components/overview/BuildStatusRail.tsx",
    "ACTION_RAIL_COMMANDS; executeCanonicalCommand();"
  );

  write(
    root,
    "apps/control-plane/src/components/chat/commandGrammar.ts",
    [
      "CANONICAL_COMMAND_CLASSES",
      '"intake"',
      '"planning"',
      '"generated_app_build"',
      '"repo_rescue"',
      '"validation_proof"',
      '"deployment_readiness"',
      '"secrets_vault"',
      '"self_upgrade"',
      '"blocker_resolution"',
      '"status_query"',
      '"general_chat"',
    ].join("\n")
  );

  const routerContent = options.badRouterExport
    ? "export function parseCommand(){}"
    : options.inferredSelfUpgrade
    ? "export function classifyIntent(){ const t='build nexus'; if(t.includes('build nexus')) return \"self_upgrade\"; return \"generated_app_build\"; }"
    : [
        "export function classifyIntent(message: string, context: { activeGeneratedAppRun?: boolean; uploadedSpecExists?: boolean } = {}) {",
        "const text = message.toLowerCase();",
        "if (text.includes('build nexus')) return \"generated_app_build\";",
        "if (context.activeGeneratedAppRun && text.includes('continue')) return \"generated_app_build\";",
        "if (context.uploadedSpecExists && text.includes('update')) return \"generated_app_build\";",
        "if (text.includes('validate')) return \"validation_proof\";",
        "if (text.includes('what now')) return \"status_query\";",
        "return \"general_chat\";",
        "}",
      ].join("\n");

  write(root, "apps/control-plane/src/components/chat/intentRouting.ts", routerContent);

  write(
    root,
    "apps/control-plane/src/components/chat/selfUpgradeGuard.ts",
    "SELF_UPGRADE_EXPLICIT_PHRASES; Self-upgrade blocked because the user did not explicitly request Botomatic modification"
  );

  const railMappings = [
    "continue current generated app build",
    "inspect failed milestone and recommend repair",
    "explain blocker and propose safe default",
    "run validate all and summarize proof",
    "show latest proof and launch readiness",
    "show missing secrets and recommended setup",
    "prepare deployment readiness, no live deployment",
    "approve current generated app build contract",
    "generate execution plan from uploaded build contract",
  ];

  if (options.missingRailMapping) {
    railMappings.pop();
  }

  write(root, "apps/control-plane/src/components/chat/actionRailCommands.ts", railMappings.join("\n"));

  write(
    root,
    "apps/control-plane/src/components/chat/intakePipeline.ts",
    [
      '"uploaded_file"',
      '"uploaded_zip"',
      '"uploaded_document"',
      '"github_url"',
      '"cloud_link"',
      '"pasted_text"',
      '"local_manifest_json"',
      '"existing_project_reference"',
      "source_input",
      "intake_source",
      "source_manifest",
      "extracted_context",
      "build_contract_context",
      "planning",
      "execution",
    ].join("\n")
  );

  write(
    root,
    "apps/control-plane/src/components/chat/nextBestAction.ts",
    [
      "projectStatus",
      "uploadedSpecExists",
      "buildContractApproved",
      "approvalStatus",
      "activeRunId",
      "currentMilestone",
      "completedMilestones",
      "failedMilestone",
      "repairAttempts",
      "blockers",
      "validationStatus",
      "launchGateStatus",
      "missingSecretsCount",
      "proofStatus",
    ].join("\n")
  );

  write(
    root,
    "apps/control-plane/src/components/chat/chatCommandExecutor.ts",
    [
      "evaluateSelfUpgradeGuard",
      "createSelfUpgradeSpec",
      "intent: \"generated_app_build\"",
      "runPipelineFromIntakeContext",
      "source_input -> intake_source -> source_manifest -> extracted_context -> build_contract_context -> planning -> execution",
      "Current state",
      "Next best action",
      "Why",
      "Risk",
      "Command I will run",
    ].join("\n")
  );

  write(root, "apps/control-plane/src/services/operator.ts", "/operator/send");
  write(root, "packages/master-truth/src/compiler.ts", "canonicalSpec productIntent openQuestions");

  write(
    root,
    "packages/validation/src/tests/chatDrivenControl.test.ts",
    [
      "build Nexus from uploaded v11",
      "generated_app_build",
      "validate it",
      "what now",
      "upgrade Botomatic validator logic",
      "modify Botomatic itself",
      "ACTION_RAIL_COMMANDS",
    ].join("\n")
  );

  write(root, "package.json", '{"scripts":{"test:chat-driven-control":"x","test:universal":"x && test:chat-driven-control"}}');

  return root;
}

function testValidatorFailsWhenRouterExportsMissing() {
  const root = createFixture({ badRouterExport: true });
  const result = validateChatFirstOperatorRouting(root);
  assert.strictEqual(result.status, "failed");
}

function testValidatorFailsWhenSelfUpgradeInferredFromBuildNexus() {
  const root = createFixture({ inferredSelfUpgrade: true });
  const result = validateChatFirstOperatorRouting(root);
  assert.strictEqual(result.status, "failed");
}

function testValidatorFailsWhenActionRailMappingMissing() {
  const root = createFixture({ missingRailMapping: true });
  const result = validateChatFirstOperatorRouting(root);
  assert.strictEqual(result.status, "failed");
}

function testValidatorPassesCurrentRepository() {
  const root = process.cwd();
  const result = validateChatFirstOperatorRouting(root);
  assert.strictEqual(result.status, "passed");
}

function run() {
  testValidatorFailsWhenRouterExportsMissing();
  testValidatorFailsWhenSelfUpgradeInferredFromBuildNexus();
  testValidatorFailsWhenActionRailMappingMissing();
  testValidatorPassesCurrentRepository();
  console.log("chatFirstOperatorRoutingValidator.test.ts passed");
}

run();
