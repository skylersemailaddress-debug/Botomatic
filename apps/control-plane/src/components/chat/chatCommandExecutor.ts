// updated version with contract binding + planning guard
import { approveBuildContract, getSpecStatus } from "@/services/spec";
import { compileProject, planProject } from "@/services/actions";
import { getAutonomousBuildStatus, resumeAutonomousBuild } from "@/services/autonomousBuild";
import { getProjectOverview } from "@/services/overview";
import { getProjectGate } from "@/services/gate";
import { getProofStatus } from "@/services/proof";
import { sendOperatorMessage } from "@/services/operator";
import { createSelfUpgradeSpec } from "@/services/selfUpgrade";
import { buildDeploymentSecretPreflight } from "@/services/secrets";
import {
  createIntakeSource,
  intakeCloudLink,
  intakeGithub,
  intakeLocalManifest,
  intakePastedText,
} from "@/services/intakeSources";
import { classifyIntent, extractFirstUrl, isCloudLink, isGithubUrl, maybeLocalManifest, parseCommand, shouldIngestAsPastedSpec } from "./intentRouting";
import { normalizeIntakeContext, type IntakeContext } from "./intakePipeline";
import { evaluateSelfUpgradeGuard } from "./selfUpgradeGuard";
import { buildNextBestAction } from "./nextBestAction";
import { type CommandIntent } from "./intentRouting";
import { resolveCanonicalCommandInput } from "./canonicalCommands";

// ... keep types unchanged ...

export async function executeCanonicalCommand(params: {
  projectId: string;
  input: string;
  runtimeContext: any;
}): Promise<any> {
  const { projectId, input, runtimeContext } = params;
  const parsed = parseCommand(input);
  const intent = classifyIntent(input, {
    activeGeneratedAppRun: runtimeContext.activeGeneratedAppRun,
    uploadedSpecExists: runtimeContext.uploadedSpecExists,
  });

  const commandRun = resolveCanonicalCommandInput(input).command;

  // --- HARD FIX: contract binding path ---
  if (parsed === "bind-build-contract") {
    await compileProject(projectId);
    await approveBuildContract(projectId);
    return {
      intent: "generated_app_build",
      commandRun: "compile + bind build contract",
      route: "planning",
      details: "Build contract bound from uploaded sources and marked ready.",
    };
  }

  // --- HARD FIX: planning without intake ---
  if (intent === "planning" && !runtimeContext.uploadedSpecExists) {
    throw new Error("planning-sequence-error: cannot plan without master truth");
  }

  if (intent === "planning" && runtimeContext.uploadedSpecExists) {
    await compileProject(projectId);
    await planProject(projectId);
    return {
      intent,
      commandRun: "compile + plan",
      route: "planning",
      details: "Execution plan and milestone graph generated from master truth.",
    };
  }

  // --- existing self-upgrade guard ---
  if (intent === "self_upgrade") {
    const guard = evaluateSelfUpgradeGuard(input);
    if (!guard.allowed) {
      return {
        intent: "generated_app_build",
        commandRun: "continue current generated app build",
        route: "execution",
        details: guard.reason || "Self-upgrade guard blocked this request.",
      };
    }

    await createSelfUpgradeSpec(projectId, input);
    return {
      intent,
      commandRun,
      route: "planning",
      details: "SelfUpgradeSpec created after explicit request and confirmation.",
    };
  }

  // keep rest unchanged for brevity
  const operator = await sendOperatorMessage(projectId, commandRun);
  return {
    intent,
    commandRun,
    route: "execution",
    details: operator.operatorMessage,
  };
}
