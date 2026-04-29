import { type UIEditCommand } from "./uiEditCommand";

export type UIPreviewReviewAction = "confirm" | "reject" | "resolveTarget" | "none";
export type UIPreviewReviewPayload = {
  commandSummary: string;
  targetSummary: string;
  confirmationRequired: boolean;
  guardrailSummary: string;
  diffSummary: string;
  sourceSyncPlanningSummary: string;
  undoAvailable: boolean;
  redoAvailable: boolean;
  requiredAction: UIPreviewReviewAction;
  claimBoundary: string;
};

const CLAIM = "Review payload is informational only and does not prove full source sync, live UI builder completion, or export/launch readiness.";

export function createUIPreviewReviewPayload(input: { command?: UIEditCommand; workflowResult?: any; history?: { pointer: number; entries: any[] } }): UIPreviewReviewPayload {
  const command = input.command ?? input.workflowResult?.mutationResult?.command;
  const diff = input.workflowResult?.diff;
  const guardrails = input.workflowResult?.guardrails;
  const sourceSyncPlan = input.workflowResult?.sourceSyncPlan;
  const history = input.history ?? input.workflowResult?.history;
  const confirmationRequired = Boolean(command?.safety?.requiresConfirmation);
  const requiredAction: UIPreviewReviewAction = input.workflowResult?.status === "needsResolution" ? "resolveTarget" : confirmationRequired ? "confirm" : "none";
  return {
    commandSummary: command ? `${command.kind} via ${command.source}` : "No command available",
    targetSummary: command?.target?.reference ? `${command.target.reference.referenceKind}:${command.target.reference.normalizedReference}` : "No target",
    confirmationRequired,
    guardrailSummary: guardrails ? `${guardrails.status} (${(guardrails.issues ?? []).length} issues)` : "guardrails pending",
    diffSummary: diff ? `${(diff.operations ?? []).length} operations across ${(diff.changedNodeIds ?? []).length} nodes` : "no diff",
    sourceSyncPlanningSummary: sourceSyncPlan?.caveat ?? "planning-only sync summary unavailable",
    undoAvailable: Boolean(history && history.pointer >= 0),
    redoAvailable: Boolean(history && history.pointer < ((history.entries?.length ?? 0) - 1)),
    requiredAction,
    claimBoundary: CLAIM,
  };
}

export function summarizeUIPreviewReviewPayload(payload: UIPreviewReviewPayload): string {
  return `${payload.commandSummary}; target=${payload.targetSummary}; confirm=${payload.confirmationRequired}; guardrails=${payload.guardrailSummary}; diff=${payload.diffSummary}; sourceSync=${payload.sourceSyncPlanningSummary}`;
}

export function validateUIPreviewReviewPayload(payload: Partial<UIPreviewReviewPayload>): { valid: boolean; issues: string[] } {
  const issues: string[] = [];
  if (!payload.commandSummary) issues.push("commandSummary missing");
  if (!payload.targetSummary) issues.push("targetSummary missing");
  if (typeof payload.confirmationRequired !== "boolean") issues.push("confirmationRequired missing");
  if (!payload.claimBoundary?.includes("informational")) issues.push("claimBoundary missing");
  return { valid: issues.length === 0, issues };
}
