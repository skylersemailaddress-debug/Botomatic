import { buildSystemIntelligence, type SystemIntelligence } from "./systemIntelligence";

export type NextActionInput = {
  projectStatus: string;
  uploadedSpecExists: boolean;
  buildContractApproved: boolean;
  approvalStatus: string;
  activeRunId?: string;
  currentMilestone?: string;
  completedMilestones?: string[];
  failedMilestone?: string | null;
  repairAttempts?: number;
  blockers?: string[];
  validationStatus: string;
  launchGateStatus: string;
  missingSecretsCount: number;
  proofStatus: "passed" | "failed" | "not_started";
  failureCategory?: string;
  failureSignature?: string;
  attemptsBySignature?: number;
  escalationRequired?: boolean;
  approvalRequired?: boolean;
  repairBudgetExhausted?: boolean;
};

export type NextBestActionOutput = SystemIntelligence & {
  userApprovalRequired: boolean;
};

export function buildNextBestAction(input: NextActionInput): NextBestActionOutput {
  const blockers = [...(input.blockers || [])];
  if (input.missingSecretsCount > 0) {
    blockers.push(`Missing required secrets: ${input.missingSecretsCount}`);
  }

  if ((input.repairAttempts || 0) >= 6 && input.failedMilestone) {
    blockers.unshift(`repair_budget_exhausted on milestone ${input.failedMilestone}`);
  }
  if (input.failureCategory) {
    blockers.unshift(`failure_category=${input.failureCategory}`);
  }

  const base = buildSystemIntelligence({
    runStatus: input.projectStatus,
    readinessStatus: input.validationStatus,
    blockerTexts: blockers,
    currentMilestone: input.currentMilestone,
    runId: input.activeRunId,
  });

  let userApprovalRequired = false;
  if (!input.buildContractApproved || input.approvalStatus !== "approved") {
    userApprovalRequired = true;
  }
  if (input.launchGateStatus === "blocked" && input.missingSecretsCount > 0) {
    userApprovalRequired = true;
  }

  if (input.proofStatus !== "passed" && base.nextBestAction === "continue build") {
    base.nextBestAction = "validate";
    base.why = "Validation proof is not passed yet; continue only after validation summary is reviewed.";
    base.suggestedCommand = "validate";
  }

  if ((input.repairAttempts || 0) >= 6 && input.failedMilestone) {
    base.nextBestAction = `inspect failed milestone ${input.failedMilestone}`;
    base.why = "Repair budget is exhausted. Continuing blindly is likely to repeat the failure loop.";
    base.suggestedCommand = `inspect failed milestone ${input.failedMilestone}`;
  }

  if (input.repairBudgetExhausted && input.failedMilestone) {
    base.nextBestAction = `inspect failed milestone ${input.failedMilestone}`;
    base.why = "Signature-level repair budget is exhausted; inspect before attempting another repair.";
    base.suggestedCommand = `inspect failed milestone ${input.failedMilestone}`;
  }

  if (input.failureCategory === "missing_human_decision" || input.failureCategory === "missing_secret_or_credential" || input.escalationRequired || input.approvalRequired) {
    base.nextBestAction = `resolve blocker for ${input.failedMilestone || input.currentMilestone || "current milestone"}`;
    base.why = "This failure category requires a human decision before safe continuation.";
    base.suggestedCommand = "resolve blocker";
    userApprovalRequired = true;
  }

  if (input.attemptsBySignature && input.failureSignature) {
    base.safeDefault = `${base.safeDefault} Failure signature ${input.failureSignature} has ${input.attemptsBySignature} attempt(s).`;
  }

  return {
    ...base,
    userApprovalRequired,
  };
}
