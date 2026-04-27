import { approveBuildContract, getSpecStatus } from "@/services/spec";
import { planProject } from "@/services/actions";
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
import { normalizeIntakeContext, type IntakeContext, type IntakeSourceType } from "./intakePipeline";
import { evaluateSelfUpgradeGuard } from "./selfUpgradeGuard";
import { buildNextBestAction } from "./nextBestAction";
import { type CommandIntent } from "./intentRouting";

export type RuntimeContext = {
  activeGeneratedAppRun: boolean;
  uploadedSpecExists: boolean;
  runId?: string;
  currentMilestone?: string;
  completedMilestones: string[];
  failedMilestone?: string | null;
  repairAttempts: number;
  blockers: string[];
  projectStatus: string;
  validationStatus: string;
  buildContractApproved: boolean;
  approvalStatus: string;
  launchGateStatus: string;
  missingSecretsCount: number;
  proofStatus: "passed" | "failed" | "not_started";
};

export type CommandExecutionResult = {
  intent: CommandIntent;
  commandRun: string;
  route: "intake" | "planning" | "execution" | "validation";
  intakeContext?: IntakeContext;
  details: string;
};

export function formatPartnerMessage(input: {
  currentState: string;
  nextBestAction: string;
  why: string;
  risk: string;
  command: string;
  details?: string;
}): string {
  const lines = [
    `Current state:\n${input.currentState}`,
    `Next best action:\n${input.nextBestAction}`,
    `Why:\n${input.why}`,
    `Risk:\n${input.risk}`,
    `Command I will run:\n${input.command}`,
  ];
  if (input.details) {
    lines.push(`Result:\n${input.details}`);
  }
  return lines.join("\n\n");
}

export async function fetchRuntimeContext(projectId: string): Promise<RuntimeContext> {
  const [overview, specStatus, gate, proof] = await Promise.all([
    getProjectOverview(projectId),
    getSpecStatus(projectId),
    getProjectGate(projectId),
    getProofStatus(projectId),
  ]);

  let autonomous: any = null;
  try {
    autonomous = await getAutonomousBuildStatus(projectId);
  } catch {
    autonomous = null;
  }

  const run = autonomous?.run;
  let missingSecretsCount = 0;
  try {
    const preflight = buildDeploymentSecretPreflight("prod");
    missingSecretsCount = preflight.missingSecretCount || 0;
  } catch {
    missingSecretsCount = 0;
  }

  const blockers = [
    ...(overview.blockers || []),
    ...(specStatus.blockers || []),
    ...((run?.humanBlockers || []).map((item: any) => item.detail || item.code || "")),
  ].filter(Boolean);

  return {
    activeGeneratedAppRun: Boolean(run),
    uploadedSpecExists: Boolean((specStatus?.spec && Object.keys(specStatus.spec || {}).length > 0) || (overview.summary?.packetCount || 0) > 0),
    runId: run?.runId,
    currentMilestone: run?.checkpoint?.currentMilestone,
    completedMilestones: run?.checkpoint?.completedMilestones || [],
    failedMilestone: run?.checkpoint?.failedMilestone || null,
    repairAttempts: Number(run?.checkpoint?.repairAttempts || 0),
    blockers,
    projectStatus: overview.latestRun?.status || "idle",
    validationStatus: overview.readiness?.status || "not_started",
    buildContractApproved: !specStatus.buildBlocked,
    approvalStatus: gate.approvalStatus || "pending",
    launchGateStatus: gate.launchStatus || "blocked",
    missingSecretsCount,
    proofStatus: proof.benchmark?.launchablePass ? "passed" : proof.lastProofRun ? "failed" : "not_started",
  };
}

function classifyFailureType(context: RuntimeContext): string {
  const blockerText = context.blockers.join(" ").toLowerCase();
  if (/repair_budget_exhausted/.test(blockerText) || context.repairAttempts >= 6) {
    return "generated Nexus app implementation failure";
  }
  if (/spec|contract|clarification|assumption/.test(blockerText)) {
    return "build contract ambiguity";
  }
  if (/internal|orchestrator|builder/.test(blockerText)) {
    return "Botomatic builder defect";
  }
  if (/approve|decision|compliance|legal/.test(blockerText)) {
    return "missing human decision";
  }
  return "generated Nexus app implementation failure";
}

function resolveRoute(intent: CommandIntent): "intake" | "planning" | "execution" | "validation" {
  if (intent === "validation_proof" || intent === "deployment_readiness" || intent === "secrets_vault") {
    return "validation";
  }
  if (intent === "planning") {
    return "planning";
  }
  if (intent === "intake" || intent === "generated_app_build" || intent === "repo_rescue" || intent === "self_upgrade") {
    return "intake";
  }
  return "execution";
}

async function runIntake(projectId: string, text: string, intent: CommandIntent): Promise<{ details: string; intakeContext?: IntakeContext }> {
  const firstUrl = extractFirstUrl(text);
  if (firstUrl && isGithubUrl(firstUrl)) {
    const result = await intakeGithub(projectId, { sourceUrl: firstUrl, allowClone: true });
    return {
      details: result.message || `GitHub source accepted: ${firstUrl}`,
      intakeContext: normalizeIntakeContext({ sourceType: "github_url", value: firstUrl, suggestedIntent: intent === "repo_rescue" ? "repo_rescue" : "generated_app_build" }),
    };
  }

  if (firstUrl && isCloudLink(firstUrl)) {
    const result = await intakeCloudLink(projectId, {
      sourceUrl: firstUrl,
      hasConnectorCredentials: false,
      largeDownloadApproval: false,
    });
    return {
      details: result.message || `Cloud link accepted: ${firstUrl}`,
      intakeContext: normalizeIntakeContext({ sourceType: "cloud_link", value: firstUrl, suggestedIntent: intent === "repo_rescue" ? "repo_rescue" : "generated_app_build" }),
    };
  }

  const manifest = maybeLocalManifest(text);
  if (manifest) {
    const result = await intakeLocalManifest(projectId, manifest);
    return {
      details: result.message || "Local manifest accepted.",
      intakeContext: normalizeIntakeContext({ sourceType: "local_manifest_json", value: "manifest-json", suggestedIntent: "generated_app_build" }),
    };
  }

  const existingRef = text.match(/project:\/\/[^\s]+|https?:\/\/[^\s]*\/project\/[^\s]+/i)?.[0];
  if (existingRef) {
    const result = await createIntakeSource(projectId, {
      sourceType: "existing_project_reference",
      sourceUri: existingRef,
      displayName: "Existing project reference",
      provider: "internal",
    });
    return {
      details: result.message || "Existing project reference accepted.",
      intakeContext: normalizeIntakeContext({ sourceType: "existing_project_reference", value: existingRef, suggestedIntent: "repo_rescue" }),
    };
  }

  if (shouldIngestAsPastedSpec(text)) {
    const result = await intakePastedText(projectId, text, "Universal composer pasted spec");
    return {
      details: result.message || "Pasted text accepted.",
      intakeContext: normalizeIntakeContext({ sourceType: "pasted_text", value: "pasted-spec", suggestedIntent: intent === "repo_rescue" ? "repo_rescue" : "generated_app_build" }),
    };
  }

  return {
    details: "No structured intake source detected in message; continuing as command conversation.",
  };
}

export async function runPipelineFromIntakeContext(projectId: string, intakeContext: IntakeContext): Promise<string> {
  await planProject(projectId);
  const operator = await sendOperatorMessage(projectId, "continue current generated app build");
  return [
    `intake_context accepted from ${intakeContext.source_input.sourceType}.`,
    "Pipeline: source_input -> intake_source -> source_manifest -> extracted_context -> build_contract_context -> planning -> execution",
    operator.operatorMessage,
  ].join("\n");
}

export async function executeCanonicalCommand(params: {
  projectId: string;
  input: string;
  runtimeContext: RuntimeContext;
}): Promise<CommandExecutionResult> {
  const { projectId, input, runtimeContext } = params;
  const parsed = parseCommand(input);
  const intent = classifyIntent(input, {
    activeGeneratedAppRun: runtimeContext.activeGeneratedAppRun,
    uploadedSpecExists: runtimeContext.uploadedSpecExists,
  });

  const commandByParsed: Record<Exclude<ReturnType<typeof parseCommand>, null>, string> = {
    "continue-build": "continue current generated app build",
    validate: "run validate all and summarize proof",
    "explain-blocker": "explain blocker and propose safe default",
    "explain-state": "show current system state and next best action",
    "approve-plan": "approve current generated app build contract",
    "show-proof": "show latest proof and launch readiness",
    "fix-failure": "inspect failed milestone and recommend repair",
    "inspect-failure": "inspect failed milestone and recommend repair",
    "resolve-blocker": "explain blocker and propose safe default",
    "next-best-action": "show current system state and next best action",
    "configure-keys": "show missing secrets and recommended setup",
    "prepare-deployment": "prepare deployment readiness, no live deployment",
    "launch-capsule": "generate launch capsule from latest generated app artifacts",
    "generate-plan": "generate execution plan from uploaded build contract",
    "pause-run": "pause current generated app build",
  };

  const commandRun = parsed ? commandByParsed[parsed] : input;

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

  if (intent === "intake" || intent === "generated_app_build" || intent === "repo_rescue") {
    const intake = await runIntake(projectId, input, intent);
    if (intake.intakeContext) {
      const pipelineDetail = await runPipelineFromIntakeContext(projectId, intake.intakeContext);
      return {
        intent,
        commandRun,
        route: "intake",
        intakeContext: intake.intakeContext,
        details: `${intake.details}\n${pipelineDetail}`,
      };
    }
  }

  if (parsed === "continue-build") {
    await resumeAutonomousBuild(projectId);
    return {
      intent,
      commandRun,
      route: "execution",
      details: "Resumed the active generated app run.",
    };
  }

  if (parsed === "generate-plan") {
    await planProject(projectId);
    return {
      intent,
      commandRun,
      route: "planning",
      details: "Generated execution plan from current build contract context.",
    };
  }

  if (parsed === "approve-plan") {
    await approveBuildContract(projectId);
    return {
      intent,
      commandRun,
      route: "planning",
      details: "Approved current generated app build contract.",
    };
  }

  if (runtimeContext.repairAttempts >= 6 || /repair_budget_exhausted/.test(runtimeContext.blockers.join(" ").toLowerCase())) {
    const failureType = classifyFailureType(runtimeContext);
    const operator = await sendOperatorMessage(projectId, "inspect failed milestone and recommend repair");
    return {
      intent: "blocker_resolution",
      commandRun: "inspect failed milestone and recommend repair",
      route: "execution",
      details: [
        `repair_budget_exhausted detected.`,
        `Failure classification: ${failureType}.`,
        `Failing milestone: ${runtimeContext.failedMilestone || "unknown"}.`,
        `Repair attempts: ${runtimeContext.repairAttempts}.`,
        `Smallest safe repair: inspect milestone logs before continuing.`,
        operator.operatorMessage,
      ].join("\n"),
    };
  }

  const operator = await sendOperatorMessage(projectId, commandRun);
  return {
    intent,
    commandRun,
    route: resolveRoute(intent),
    details: operator.operatorMessage,
  };
}

export function buildPartnerEnvelope(context: RuntimeContext, command: string, details: string): string {
  const next = buildNextBestAction({
    projectStatus: context.projectStatus,
    uploadedSpecExists: context.uploadedSpecExists,
    buildContractApproved: context.buildContractApproved,
    approvalStatus: context.approvalStatus,
    activeRunId: context.runId,
    currentMilestone: context.currentMilestone,
    completedMilestones: context.completedMilestones,
    failedMilestone: context.failedMilestone,
    repairAttempts: context.repairAttempts,
    blockers: context.blockers,
    validationStatus: context.validationStatus,
    launchGateStatus: context.launchGateStatus,
    missingSecretsCount: context.missingSecretsCount,
    proofStatus: context.proofStatus,
  });

  const risk = next.userApprovalRequired ? "Medium. A human approval is still required before high-impact actions." : "Low. Safe-default automation can proceed.";

  return formatPartnerMessage({
    currentState: next.currentState,
    nextBestAction: next.nextBestAction,
    why: `${next.why} Safe default: ${next.safeDefault}`,
    risk,
    command,
    details,
  });
}

export function normalizeUploadedFileIntake(fileName: string): IntakeContext {
  const lowered = fileName.toLowerCase();
  const sourceType: IntakeSourceType =
    lowered.endsWith(".zip")
      ? "uploaded_zip"
      : lowered.endsWith(".pdf") || lowered.endsWith(".doc") || lowered.endsWith(".docx")
      ? "uploaded_document"
      : "uploaded_file";
  return normalizeIntakeContext({
    sourceType,
    value: fileName,
    suggestedIntent: "generated_app_build",
  });
}
