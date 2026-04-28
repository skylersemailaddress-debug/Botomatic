import assert from "assert";
import {
  evaluateChatBehaviorExecutionSimulation,
  validateChatBehaviorExecution,
  type ChatBehaviorSimulationDeps,
} from "../repoValidators/chatBehaviorExecution";

function makeDeps(overrides: Partial<ChatBehaviorSimulationDeps>): ChatBehaviorSimulationDeps {
  const base = {
    classifyIntentFn: ((input: string, context: { activeGeneratedAppRun?: boolean; uploadedSpecExists?: boolean } = {}) => {
      const text = input.toLowerCase();
      if (text.includes("do not enter self-upgrade") || text.includes("not a botomatic self-upgrade")) return "generated_app_build" as const;
      if (text.includes("compile project") || text.includes("mastertruth") || text.includes("master truth") || text.includes("build contract")) return "planning" as const;
      if (text.includes("upgrade botomatic") || text.includes("modify botomatic")) return "self_upgrade" as const;
      if (text.includes("validate")) return "validation_proof" as const;
      if (text.includes("what now")) return "status_query" as const;
      if (text.includes("fix failed milestone")) return "blocker_resolution" as const;
      if (text.includes("build nexus") || text.includes("update the ui")) return "generated_app_build" as const;
      if (text.includes("continue") && context.activeGeneratedAppRun) return "generated_app_build" as const;
      return "general_chat" as const;
    }) as ChatBehaviorSimulationDeps["classifyIntentFn"],
    resolveCanonicalCommandInputFn: ((input: string) => {
      const text = input.toLowerCase();
      if (text === "continue") return { parsed: "continue-build", command: "continue current generated app build" };
      if (text.includes("fix failed milestone")) return { parsed: "fix-failure", command: "inspect failed milestone and recommend repair" };
      if (text.includes("validate")) return { parsed: "validate", command: "run validate all and summarize proof" };
      if (text.includes("what now")) return { parsed: "next-best-action", command: "show current system state and next best action" };
      if (text.includes("compile project") || text.includes("mastertruth") || text.includes("master truth") || text.includes("canonical build contract")) {
        return { parsed: "bind-build-contract", command: "bind uploaded contract as canonical build contract and compile project" };
      }
      return { parsed: null, command: input };
    }) as ChatBehaviorSimulationDeps["resolveCanonicalCommandInputFn"],
    evaluateSelfUpgradeGuardFn: ((input: string) => {
      const text = input.toLowerCase();
      if (text.includes("do not enter self-upgrade") || text.includes("not a botomatic self-upgrade")) {
        return {
          allowed: false,
          requiresConfirmation: false,
          reason: "Self-upgrade blocked because the request explicitly negates self-upgrade and has been routed to generated_app_build/planning.",
        };
      }
      if (text.includes("upgrade botomatic") || text.includes("modify botomatic")) {
        if (text.includes("confirm self-upgrade")) {
          return { allowed: true, requiresConfirmation: false };
        }
        return { allowed: false, requiresConfirmation: true, reason: "need confirm" };
      }
      return {
        allowed: false,
        requiresConfirmation: false,
        reason: "Self-upgrade blocked because the user did not explicitly request Botomatic modification. This request has been routed to generated_app_build.",
      };
    }) as ChatBehaviorSimulationDeps["evaluateSelfUpgradeGuardFn"],
    actionRailCommands: {
      continue_build: "continue current generated app build",
      inspect_failure: "inspect failed milestone and recommend repair",
      resolve_blocker: "explain blocker and propose safe default",
      validate: "run validate all and summarize proof",
      show_proof: "show latest proof and launch readiness",
      configure_keys: "show missing secrets and recommended setup",
      prepare_deployment: "prepare deployment readiness, no live deployment",
      approve_contract: "approve current generated app build contract",
      generate_plan: "generate execution plan from uploaded build contract",
    },
    normalizeIntakeContextFn: ((input: any) => ({
      source_input: { sourceType: input.sourceType, value: input.value },
      intake_source: {
        provider:
          input.sourceType === "github_url"
            ? "github"
            : input.sourceType === "cloud_link"
            ? "cloud"
            : input.sourceType === "pasted_text"
            ? "text"
            : input.sourceType === "local_manifest_json"
            ? "manifest"
            : input.sourceType === "existing_project_reference"
            ? "existing"
            : "local",
        accepted: true,
      },
      source_manifest: { manifestType: "m", summary: "s" },
      extracted_context: { contextRef: "x", extracted: true },
      build_contract_context: { seededFromIntake: true, recommendedIntent: "generated_app_build" },
      planning: { required: true },
      execution: { required: true },
    })) as ChatBehaviorSimulationDeps["normalizeIntakeContextFn"],
    buildNextBestActionFn: ((_: any) => ({
      currentState: "state",
      nextBestAction: "action",
      why: "why",
      safeDefault: "safe",
      blockers: [],
      suggestedCommand: "cmd",
      userApprovalRequired: false,
    })) as ChatBehaviorSimulationDeps["buildNextBestActionFn"],
    canonicalIntentClasses: [
      { intent: "intake", triggers: [], outputs: [] },
      { intent: "planning", triggers: [], outputs: [] },
      { intent: "generated_app_build", triggers: [], outputs: [] },
      { intent: "repo_rescue", triggers: [], outputs: [] },
      { intent: "validation_proof", triggers: [], outputs: [] },
      { intent: "deployment_readiness", triggers: [], outputs: [] },
      { intent: "secrets_vault", triggers: [], outputs: [] },
      { intent: "self_upgrade", triggers: [], outputs: [] },
      { intent: "blocker_resolution", triggers: [], outputs: [] },
      { intent: "status_query", triggers: [], outputs: [] },
      { intent: "general_chat", triggers: [], outputs: [] },
    ],
  } satisfies ChatBehaviorSimulationDeps;

  return {
    ...base,
    ...overrides,
  };
}

function testSimulationFailsWhenBuildNexusRoutesToSelfUpgrade() {
  const deps = makeDeps({
    classifyIntentFn: ((input: string) => {
      if (input.toLowerCase().includes("build nexus")) return "self_upgrade" as const;
      return "general_chat" as const;
    }) as ChatBehaviorSimulationDeps["classifyIntentFn"],
  });
  const result = evaluateChatBehaviorExecutionSimulation(deps);
  assert.strictEqual(result.ok, false);
}

function testSimulationFailsWhenContinueWithActiveRunMisroutes() {
  const deps = makeDeps({
    classifyIntentFn: ((input: string) => {
      if (input.toLowerCase() === "continue") return "status_query" as const;
      return "general_chat" as const;
    }) as ChatBehaviorSimulationDeps["classifyIntentFn"],
  });
  const result = evaluateChatBehaviorExecutionSimulation(deps);
  assert.strictEqual(result.ok, false);
}

function testSimulationFailsWhenActionRailMappingMissing() {
  const deps = makeDeps({
    actionRailCommands: {
      continue_build: "continue current generated app build",
      inspect_failure: "inspect failed milestone and recommend repair",
      resolve_blocker: "explain blocker and propose safe default",
      validate: "run validate all and summarize proof",
      show_proof: "show latest proof and launch readiness",
      configure_keys: "show missing secrets and recommended setup",
      prepare_deployment: "prepare deployment readiness, no live deployment",
      approve_contract: "approve current generated app build contract",
      generate_plan: "wrong command",
    },
  });
  const result = evaluateChatBehaviorExecutionSimulation(deps);
  assert.strictEqual(result.ok, false);
}

function testValidatorPassesCurrentRepository() {
  const result = validateChatBehaviorExecution(process.cwd());
  assert.strictEqual(result.status, "passed");
}

function run() {
  testSimulationFailsWhenBuildNexusRoutesToSelfUpgrade();
  testSimulationFailsWhenContinueWithActiveRunMisroutes();
  testSimulationFailsWhenActionRailMappingMissing();
  testValidatorPassesCurrentRepository();
  console.log("chatBehaviorExecutionValidator.test.ts passed");
}

run();
