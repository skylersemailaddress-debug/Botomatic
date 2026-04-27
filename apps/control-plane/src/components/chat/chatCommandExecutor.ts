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
import { normalizeIntakeContext, type IntakeContext, type IntakeSourceType } from "./intakePipeline";
import { assertSelfUpgradeAllowed, evaluateSelfUpgradeGuard } from "./selfUpgradeGuard";
import { buildNextBestAction } from "./nextBestAction";
import { type CommandIntent } from "./intentRouting";
import { resolveCanonicalCommandInput } from "./canonicalCommands";

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
  failureInspection?: {
    runId: string;
    milestoneId: string;
    failureCategory: string;
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
  } | null;
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
  failedMilestone: string;
  failureCategory: string;
  evidence: string;
  failureSignature: string;
  recommendedStrategy: string;
  whyThisStrategy: string;
  rejectedStrategies: string;
  priorSimilarOutcomes: string;
  whatAlreadyTried: string;
  nextBestAction: string;
  risk: string;
  validationAfterRepair: string;
  rollback: string;
  command: string;
  needDecision: boolean;
  userQuestion?: string;
  details?: string;
}): string {
  const lines = [
    `Current state:\n${input.currentState}`,
    `Failed milestone:\n${input.failedMilestone}`,
    `Failure category:\n${input.failureCategory}`,
    `Evidence:\n${input.evidence}`,
    `Failure signature:\n${input.failureSignature}`,
    `Recommended strategy:\n${input.recommendedStrategy}`,
    `Why this strategy:\n${input.whyThisStrategy}`,
    `Rejected strategies:\n${input.rejectedStrategies}`,
    `Prior similar outcomes:\n${input.priorSimilarOutcomes}`,
    `What I already tried:\n${input.whatAlreadyTried}`,
    `Recommended next action:\n${input.nextBestAction}`,
    `Risk:\n${input.risk}`,
    `Validation after repair:\n${input.validationAfterRepair}`,
    `Rollback:\n${input.rollback}`,
    `Command I will run:\n${input.command}`,
    `Need your decision?\n${input.needDecision ? "Yes" : "No"}.`,
  ];
  if (input.userQuestion) {
    lines.push(`Decision needed:\n${input.userQuestion}`);
  }
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
    failureInspection: run?.checkpoint?.lastFailure || null,
  };
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
  try {
    await compileProject(projectId);
  } catch (compileErr: any) {
    throw new Error(
      `planning-sequence-error: Master truth compilation failed after upload. ${compileErr?.message || compileErr}`
    );
  }

  try {
    await planProject(projectId);
  } catch (planErr: any) {
    const errMsg = String(planErr?.message || planErr).toLowerCase();
    if (errMsg.includes("no master truth") || errMsg.includes("master truth")) {
      try {
        await compileProject(projectId);
        await planProject(projectId);
      } catch (retryErr: any) {
        throw new Error(
          `planning-sequence-error: Uploaded source exists, but master truth compilation failed. ${retryErr?.message || retryErr}`
        );
      }
    } else {
      throw planErr;
    }
  }

  const operator = await sendOperatorMessage(projectId, "continue current generated app build");
  return [
    `intake_context accepted from ${intakeContext.source_input.sourceType}.`,
    "Pipeline: source_input -> intake_source -> source_manifest -> extracted_context -> compile -> build_contract_context -> planning -> execution",
    operator.operatorMessage,
  ].join("\n");
}

export async function executeCanonicalCommand(params: {
  projectId: string;
  input: string;
  runtimeContext: RuntimeContext;
}): Promise<CommandExecutionResult> {
  const { projectId, input, runtimeContext } = params;
  const canonical = resolveCanonicalCommandInput(input);
  const parsed = parseCommand(input);
  const intent = classifyIntent(canonical.command, {
    activeGeneratedAppRun: runtimeContext.activeGeneratedAppRun,
    uploadedSpecExists: runtimeContext.uploadedSpecExists,
  });

  const commandRun = canonical.command;

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

  if (intent === "self_upgrade") {
    const allowed = assertSelfUpgradeAllowed(input);
    if (!allowed.allowed) {
      return {
        intent: "generated_app_build",
        commandRun: "continue current generated app build",
        route: "execution",
        details: allowed.reason || "Self-upgrade was not explicitly allowed and has been rerouted.",
      };
    }

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
    const failure = runtimeContext.failureInspection;
    const operator = await sendOperatorMessage(projectId, "inspect failed milestone and recommend repair");
    return {
      intent: "blocker_resolution",
      commandRun: "inspect failed milestone and recommend repair",
      route: "execution",
      details: [
        `repair_budget_exhausted detected.`,
        `Failure classification: ${failure?.failureCategory || "generated_app_implementation_failure"}.`,
        `Failure signature: ${failure?.failureSignature || "unknown"}.`,
        `Recommended strategy: ${failure?.recommendedStrategyId || failure?.recommendedStrategyName || "inspect_failure"}.`,
        `Why this strategy: ${failure?.whyThisStrategy || "adaptive selector chose safest applicable strategy"}.`,
        `Rejected strategies: ${(failure?.rejectedStrategies || []).map((item) => `${item.strategyId}(${item.reason})`).join(", ") || "none"}.`,
        `Failing milestone: ${failure?.milestoneId || runtimeContext.failedMilestone || "unknown"}.`,
        `Repair attempts: ${runtimeContext.repairAttempts}.`,
        `Smallest safe repair: ${failure?.recommendedRepair || "inspect milestone logs before continuing"}.`,
        `Validation after repair: ${failure?.expectedValidationCommand || failure?.validationCommandAfterRepair || "validate:all"}.`,
        `Rollback: ${failure?.rollbackPlan || "Revert files touched in this repair attempt."}.`,
        failure?.repairBudgetExhausted
          ? `why failed: ${failure.repairBudgetExhausted.whyRepairsFailed}`
          : "why failed: repeated retries without successful targeted remediation",
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
    failureCategory: context.failureInspection?.failureCategory,
    failureSignature: context.failureInspection?.failureSignature,
    attemptsBySignature: context.failureInspection?.attemptsBySignature,
    escalationRequired: context.failureInspection?.escalationRequired,
    approvalRequired: context.failureInspection?.approvalRequired,
    repairBudgetExhausted: Boolean(context.failureInspection?.repairBudgetExhausted),
  });

  const risk = next.userApprovalRequired ? "Medium. A human approval is still required before high-impact actions." : "Low. Safe-default automation can proceed.";

  const failure = context.failureInspection;
  const failedMilestone = failure?.milestoneId || context.failedMilestone || context.currentMilestone || "none";
  const failureCategory = failure?.failureCategory || "none";
  const evidence = failure
    ? [...failure.evidence, failure.lastError ? `lastError=${failure.lastError}` : ""].filter(Boolean).join(" | ")
    : context.blockers.join(" | ") || "No active failure evidence.";
  const whatAlreadyTried = failure?.attemptedRepairs?.length
    ? `${failure.attemptedRepairs.join("; ")} (signature=${failure.failureSignature}, attempts=${failure.attemptsBySignature})`
    : `repairAttempts=${context.repairAttempts}`;
  const needDecision = next.userApprovalRequired || Boolean(failure?.escalationRequired);
  const nextAction = failure?.repairBudgetExhausted?.exactNextAction || next.nextBestAction;
  const recommendedStrategy = failure?.recommendedStrategyId || failure?.recommendedStrategyName || "inspect_failure";
  const rejectedStrategies = (failure?.rejectedStrategies || [])
    .map((item) => `${item.strategyId} - ${item.reason}`)
    .join("; ") || "none";
  const priorSimilarOutcomes = (failure?.priorSimilarOutcomes || [])
    .map((item) => `${item.strategyId}:${item.outcome}`)
    .join("; ") || "none";

  return formatPartnerMessage({
    currentState: next.currentState,
    failedMilestone,
    failureCategory,
    evidence,
    failureSignature: failure?.failureSignature || "none",
    recommendedStrategy,
    whyThisStrategy: failure?.whyThisStrategy || "Lowest-risk applicable strategy selected by adaptive policy.",
    rejectedStrategies,
    priorSimilarOutcomes,
    whatAlreadyTried,
    nextBestAction: `${nextAction}. Safe default: ${next.safeDefault}`,
    risk,
    validationAfterRepair: failure?.expectedValidationCommand || failure?.validationCommandAfterRepair || "validate:all",
    rollback: failure?.rollbackPlan || "Revert files touched in this repair attempt.",
    command,
    needDecision,
    userQuestion: failure?.userQuestion,
    details,
  });
}

export function normalizeUploadedFileIntake(fileNames: string | string[]): IntakeContext {
  const names = Array.isArray(fileNames) ? fileNames : [fileNames];
  const loweredNames = names.map((name) => String(name).toLowerCase());
  const sourceType: IntakeSourceType = loweredNames.some((name) => name.endsWith(".zip"))
    ? "uploaded_zip"
    : loweredNames.some((name) => name.endsWith(".pdf") || name.endsWith(".doc") || name.endsWith(".docx"))
    ? "uploaded_document"
    : "uploaded_file";
  return normalizeIntakeContext({
    sourceType,
    value: names.join(", "),
    suggestedIntent: "generated_app_build",
  });
}
