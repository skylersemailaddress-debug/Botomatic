import fs from "fs";
import path from "path";
import type { RepoValidatorResult } from "../repoValidators";
import { CANONICAL_COMMAND_CLASSES } from "../../../../apps/control-plane/src/components/chat/commandGrammar";
import { classifyIntent } from "../../../../apps/control-plane/src/components/chat/intentRouting";
import { evaluateSelfUpgradeGuard } from "../../../../apps/control-plane/src/components/chat/selfUpgradeGuard";
import { ACTION_RAIL_COMMANDS } from "../../../../apps/control-plane/src/components/chat/actionRailCommands";
import { normalizeIntakeContext } from "../../../../apps/control-plane/src/components/chat/intakePipeline";
import { buildNextBestAction } from "../../../../apps/control-plane/src/components/chat/nextBestAction";
import { resolveCanonicalCommandInput } from "../../../../apps/control-plane/src/components/chat/canonicalCommands";

function has(root: string, rel: string): boolean {
  return fs.existsSync(path.join(root, rel));
}

function result(ok: boolean, summary: string, checks: string[]): RepoValidatorResult {
  return {
    name: "Validate-Botomatic-ChatBehaviorExecution",
    status: ok ? "passed" : "failed",
    summary,
    checks,
  };
}

type SimulationResult = {
  ok: boolean;
  failures: string[];
};

export type ChatBehaviorSimulationDeps = {
  classifyIntentFn: typeof classifyIntent;
  resolveCanonicalCommandInputFn: typeof resolveCanonicalCommandInput;
  evaluateSelfUpgradeGuardFn: typeof evaluateSelfUpgradeGuard;
  actionRailCommands: typeof ACTION_RAIL_COMMANDS;
  normalizeIntakeContextFn: typeof normalizeIntakeContext;
  buildNextBestActionFn: typeof buildNextBestAction;
  canonicalIntentClasses: typeof CANONICAL_COMMAND_CLASSES;
};

export function evaluateChatBehaviorExecutionSimulation(
  deps: ChatBehaviorSimulationDeps = {
    classifyIntentFn: classifyIntent,
    resolveCanonicalCommandInputFn: resolveCanonicalCommandInput,
    evaluateSelfUpgradeGuardFn: evaluateSelfUpgradeGuard,
    actionRailCommands: ACTION_RAIL_COMMANDS,
    normalizeIntakeContextFn: normalizeIntakeContext,
    buildNextBestActionFn: buildNextBestAction,
    canonicalIntentClasses: CANONICAL_COMMAND_CLASSES,
  }
): SimulationResult {
  const failures: string[] = [];

  const intents = new Set(deps.canonicalIntentClasses.map((item) => item.intent));
  const requiredIntents = [
    "intake",
    "planning",
    "generated_app_build",
    "repo_rescue",
    "validation_proof",
    "deployment_readiness",
    "secrets_vault",
    "self_upgrade",
    "blocker_resolution",
    "status_query",
    "general_chat",
  ] as const;

  for (const intent of requiredIntents) {
    if (!intents.has(intent)) {
      failures.push(`Missing canonical intent: ${intent}`);
    }
  }

  const classificationCases: Array<{
    input: string;
    context?: { activeGeneratedAppRun?: boolean; uploadedSpecExists?: boolean };
    expected: Array<"generated_app_build" | "planning" | "blocker_resolution" | "validation_proof" | "status_query" | "self_upgrade">;
    deterministic: boolean;
  }> = [
    { input: "build Nexus from uploaded v11", context: { uploadedSpecExists: true }, expected: ["generated_app_build"], deterministic: true },
    {
      input: "Force bind uploaded Nexus v11 zip as the canonical build contract. Do not enter self-upgrade. Classification must be generated_app_build.",
      context: { uploadedSpecExists: true },
      expected: ["generated_app_build", "planning"],
      deterministic: true,
    },
    {
      input: "this is not a Botomatic self-upgrade, build Nexus from uploaded v11",
      context: { uploadedSpecExists: true },
      expected: ["generated_app_build"],
      deterministic: true,
    },
    { input: "continue", context: { activeGeneratedAppRun: true }, expected: ["generated_app_build"], deterministic: true },
    { input: "fix failed milestone", expected: ["blocker_resolution", "generated_app_build"], deterministic: true },
    { input: "update the UI", context: { uploadedSpecExists: true }, expected: ["generated_app_build"], deterministic: true },
    { input: "compile project from uploaded sources and set masterTruth", context: { uploadedSpecExists: true }, expected: ["planning", "generated_app_build"], deterministic: true },
    { input: "validate it", expected: ["validation_proof"], deterministic: true },
    { input: "what now", expected: ["status_query", "blocker_resolution"], deterministic: true },
    { input: "upgrade Botomatic validator logic", expected: ["self_upgrade"], deterministic: true },
    { input: "modify Botomatic itself", expected: ["self_upgrade"], deterministic: true },
  ];

  for (const testCase of classificationCases) {
    const actual = deps.classifyIntentFn(testCase.input, testCase.context || {});
    if (!testCase.expected.includes(actual as any)) {
      failures.push(`Misrouted input '${testCase.input}' -> ${actual}; expected one of ${testCase.expected.join(", ")}`);
    }
    if (testCase.deterministic && actual === "general_chat") {
      failures.push(`Deterministic input '${testCase.input}' fell back to general_chat.`);
    }
  }

  // Required hard-failure guards.
  if (deps.classifyIntentFn("build Nexus from uploaded v11", { uploadedSpecExists: true }) === "self_upgrade") {
    failures.push("Failure case triggered: build Nexus incorrectly routed to self_upgrade.");
  }
  if (deps.classifyIntentFn("continue", { activeGeneratedAppRun: true }) !== "generated_app_build") {
    failures.push("Failure case triggered: continue with active run did not route to generated_app_build.");
  }
  if (deps.classifyIntentFn("update the UI", { uploadedSpecExists: true }) === "self_upgrade") {
    failures.push("Failure case triggered: update the UI incorrectly routed to self_upgrade.");
  }

  // Self-upgrade inference protection.
  const nonSelfUpgradeInputs = [
    "build Nexus from uploaded v11",
    "Force bind uploaded Nexus v11 zip as the canonical build contract. Do not enter self-upgrade. Classification must be generated_app_build.",
    "this is not a Botomatic self-upgrade, build Nexus from uploaded v11",
    "compile project from uploaded sources and set masterTruth",
    "update the UI",
    "continue build",
    "fix generated app",
    "inspect failed milestone",
    "validate it",
    "what now",
  ];
  for (const input of nonSelfUpgradeInputs) {
    if (deps.classifyIntentFn(input, { uploadedSpecExists: true, activeGeneratedAppRun: true }) === "self_upgrade") {
      failures.push(`Self-upgrade was inferred for non-explicit input: '${input}'.`);
    }
  }

  const guardBlocked = deps.evaluateSelfUpgradeGuardFn("build Nexus from uploaded v11");
  if (guardBlocked.allowed) {
    failures.push("Self-upgrade guard allowed non-explicit self-upgrade request.");
  }

  const guardNeedsConfirm = deps.evaluateSelfUpgradeGuardFn("upgrade Botomatic validator logic");
  if (guardNeedsConfirm.allowed || !guardNeedsConfirm.requiresConfirmation) {
    failures.push("Self-upgrade guard did not require confirmation for explicit request.");
  }

  const guardConfirmed = deps.evaluateSelfUpgradeGuardFn("upgrade Botomatic validator logic and confirm self-upgrade");
  if (!guardConfirmed.allowed) {
    failures.push("Self-upgrade guard blocked explicit confirmed self-upgrade.");
  }

  const canonicalExpectations: Array<{ input: string; command: string }> = [
    { input: "continue", command: "continue current generated app build" },
    { input: "fix failed milestone", command: "inspect failed milestone and recommend repair" },
    { input: "validate it", command: "run validate all and summarize proof" },
    { input: "what now", command: "show current system state and next best action" },
  ];

  for (const item of canonicalExpectations) {
    const resolved = deps.resolveCanonicalCommandInputFn(item.input).command;
    if (resolved !== item.command) {
      failures.push(`Canonical command mismatch for '${item.input}': got '${resolved}', expected '${item.command}'.`);
    }
  }

  const requiredRailMappings: Array<[keyof typeof ACTION_RAIL_COMMANDS, string]> = [
    ["continue_build", "continue current generated app build"],
    ["inspect_failure", "inspect failed milestone and recommend repair"],
    ["resolve_blocker", "explain blocker and propose safe default"],
    ["validate", "run validate all and summarize proof"],
    ["show_proof", "show latest proof and launch readiness"],
    ["configure_keys", "show missing secrets and recommended setup"],
    ["prepare_deployment", "prepare deployment readiness, no live deployment"],
    ["approve_contract", "approve current generated app build contract"],
    ["generate_plan", "generate execution plan from uploaded build contract"],
  ];

  for (const [key, value] of requiredRailMappings) {
    if (deps.actionRailCommands[key] !== value) {
      failures.push(`Action rail mapping mismatch for ${key}.`);
    }
  }

  const intakeVariants = [
    ["uploaded_file", "local"],
    ["uploaded_zip", "local"],
    ["uploaded_document", "local"],
    ["github_url", "github"],
    ["cloud_link", "cloud"],
    ["pasted_text", "text"],
    ["local_manifest_json", "manifest"],
    ["existing_project_reference", "existing"],
  ] as const;

  for (const [sourceType, provider] of intakeVariants) {
    const intake = deps.normalizeIntakeContextFn({
      sourceType,
      value: `sample-${sourceType}`,
      suggestedIntent: sourceType === "existing_project_reference" ? "repo_rescue" : "generated_app_build",
    });

    if (intake.source_input.sourceType !== sourceType) {
      failures.push(`Intake source_input mismatch for ${sourceType}.`);
    }
    if (intake.intake_source.provider !== provider) {
      failures.push(`Intake provider mismatch for ${sourceType}.`);
    }
    if (!intake.extracted_context.extracted || !intake.build_contract_context.seededFromIntake || !intake.planning.required || !intake.execution.required) {
      failures.push(`Unified intake pipeline stages missing for ${sourceType}.`);
    }
  }

  const next = deps.buildNextBestActionFn({
    projectStatus: "failed",
    uploadedSpecExists: true,
    buildContractApproved: false,
    approvalStatus: "pending",
    activeRunId: "run_42",
    currentMilestone: "core_workflows",
    completedMilestones: ["intake", "planning"],
    failedMilestone: "core_workflows",
    repairAttempts: 6,
    blockers: ["repair_budget_exhausted"],
    validationStatus: "not_started",
    launchGateStatus: "blocked",
    missingSecretsCount: 3,
    proofStatus: "failed",
  });

  if (!next.currentState || !next.nextBestAction || !next.why || !next.safeDefault || !next.suggestedCommand) {
    failures.push("Next-best-action engine did not provide full state/action rationale output.");
  }

  return {
    ok: failures.length === 0,
    failures,
  };
}

export function validateChatBehaviorExecution(root: string): RepoValidatorResult {
  const checks = [
    "apps/control-plane/src/components/chat/commandGrammar.ts",
    "apps/control-plane/src/components/chat/intentRouting.ts",
    "apps/control-plane/src/components/chat/selfUpgradeGuard.ts",
    "apps/control-plane/src/components/chat/intakePipeline.ts",
    "apps/control-plane/src/components/chat/nextBestAction.ts",
    "apps/control-plane/src/components/chat/chatCommandExecutor.ts",
    "apps/control-plane/src/components/chat/actionRailCommands.ts",
    "apps/control-plane/src/components/chat/canonicalCommands.ts",
    "apps/control-plane/src/components/chat/ConversationPane.tsx",
    "apps/control-plane/src/components/overview/BuildStatusRail.tsx",
  ];

  const missing = checks.filter((rel) => !has(root, rel));
  if (missing.length > 0) {
    return result(false, `Behavioral chat routing validator missing required files: ${missing.join(", ")}`, checks);
  }

  const simulation = evaluateChatBehaviorExecutionSimulation();
  if (!simulation.ok) {
    return result(false, `Behavioral routing simulation failed: ${simulation.failures.join(" | ")}`, checks);
  }

  return result(
    true,
    "Behavioral routing simulation confirms runtime intent classification, self-upgrade guardrails, canonical command dispatch, action-rail parity, unified intake normalization, and next-best-action outputs.",
    checks
  );
}
