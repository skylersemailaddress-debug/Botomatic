import { applyUIEditWorkflow } from "./uiEditWorkflow";
import { parseUIEditCommand, type UIEditCommandSource } from "./uiEditCommand";
import { createUIPreviewReviewPayload, summarizeUIPreviewReviewPayload } from "./uiPreviewReviewPayload";
import { applyUIPreviewInteractionResult, updateUIPreviewSelection, type UIPreviewInteractionState } from "./uiPreviewInteractionState";

export type UIPreviewInteractionInput = { text?: string; source: UIEditCommandSource; selectedNodeId?: string; selectedPageId?: string; createdAt?: string; now?: string; idSeed?: string; confirmationMarker?: boolean };
export type UIPreviewInteractionAdapterContext = { now?: string; idSeed?: string; confirmationMarker?: boolean };
export type UIPreviewInteractionResult = { status: string; editableDocument: any; previewPatch?: any; diff?: any; guardrails?: any; sourceSyncPlan?: any; history: any; reviewPayload: any; userFacingSummary: string; claimBoundary: string; workflowResult?: any; command?: any; pendingReview?: any; nextState: UIPreviewInteractionState };
// typedChat and spokenChat inputs both route through parseUIEditCommand.
const CLAIM = "Adapter wires chat/selection/workflow interactions for preview model only. Planning-only source sync; no full source rewrite/live-builder/export claim.";

export function handleUIPreviewSelectionChange(input: UIPreviewInteractionInput, state: UIPreviewInteractionState): UIPreviewInteractionState {
  return updateUIPreviewSelection(state, { selectedNodeId: input.selectedNodeId, selectedPageId: input.selectedPageId, source: input.source === "spokenChat" ? "spokenChat" : "chat" });
}

export function handleUIPreviewChatEdit(input: UIPreviewInteractionInput, state: UIPreviewInteractionState, context?: UIPreviewInteractionAdapterContext): UIPreviewInteractionResult {
  const selected = handleUIPreviewSelectionChange(input, state);
  const parsed = parseUIEditCommand({ text: input.text ?? "", source: input.source, selectedNodeId: selected.selection.selectedNodeId, createdAt: input.createdAt ?? context?.now ?? input.now });
  if (!parsed.ok || !parsed.command) return baseResult("invalid", selected, undefined, "Could not parse command");
  const command = parsed.command;
  if (command.safety.requiresResolution && !command.target.reference.nodeId && command.kind !== "addPage" && command.kind !== "retheme") {
    const reviewPayload = createUIPreviewReviewPayload({ command, history: selected.history });
    return withState({ ...baseResult("needsResolution", selected, command, summarizeUIPreviewReviewPayload(reviewPayload)), reviewPayload, pendingReview: { required: false, command, payload: reviewPayload } }, selected);
  }
  if (command.safety.requiresConfirmation) {
    const reviewPayload = createUIPreviewReviewPayload({ command, history: selected.history });
    return withState({ ...baseResult("needsConfirmation", selected, command, summarizeUIPreviewReviewPayload(reviewPayload)), reviewPayload, pendingReview: { required: true, command, payload: reviewPayload, selectionSnapshot: selected.selection, selectedNodeId: selected.selection.selectedNodeId, selectedPageId: selected.selection.selectedPageId } }, selected);
  }
  const workflow = applyUIEditWorkflow(selected.editableDocument, command, { confirmed: true, selection: selected.selection, history: selected.history, now: context?.now ?? input.now, idSeed: context?.idSeed ?? input.idSeed, confirmationMarker: context?.confirmationMarker ?? input.confirmationMarker });
  return fromWorkflow(workflow.status, selected, command, workflow);
}

export function confirmUIPreviewPendingEdit(state: UIPreviewInteractionState, context?: UIPreviewInteractionAdapterContext): UIPreviewInteractionResult {
  const pending = state.pendingReview;
  if (!pending?.command) return baseResult("invalid", state, undefined, "No pending command");
  const replaySelection = pending.selectionSnapshot ?? state.selection;
  const workflow = applyUIEditWorkflow(state.editableDocument, pending.command, { confirmed: true, selection: replaySelection, history: state.history, now: context?.now, idSeed: context?.idSeed, confirmationMarker: context?.confirmationMarker ?? true });
  const out = fromWorkflow(workflow.status, state, pending.command, workflow);
  return withState({ ...out, pendingReview: undefined }, out.nextState);
}

export function rejectUIPreviewPendingEdit(state: UIPreviewInteractionState): UIPreviewInteractionResult {
  const reviewPayload = createUIPreviewReviewPayload({ history: state.history });
  return withState({ ...baseResult("idle", state, undefined, "Pending edit rejected"), reviewPayload, pendingReview: undefined }, state);
}

function baseResult(status: string, state: UIPreviewInteractionState, command: any, summary: string): UIPreviewInteractionResult {
  const reviewPayload = createUIPreviewReviewPayload({ command, history: state.history });
  return { status, editableDocument: state.editableDocument, history: state.history, reviewPayload, userFacingSummary: summary, claimBoundary: CLAIM, command, nextState: state };
}

function fromWorkflow(status: string, state: UIPreviewInteractionState, command: any, workflow: any): UIPreviewInteractionResult {
  const reviewPayload = createUIPreviewReviewPayload({ command, workflowResult: workflow, history: workflow.history });
  const result = { status, editableDocument: workflow.status === "applied" ? workflow.currentDocument : state.editableDocument, previewPatch: workflow.mutationResult?.previewPatch, diff: workflow.diff, guardrails: workflow.guardrails, sourceSyncPlan: workflow.sourceSyncPlan, history: workflow.history ?? state.history, reviewPayload, userFacingSummary: summarizeUIPreviewReviewPayload(reviewPayload), claimBoundary: CLAIM, workflowResult: workflow, command, pendingReview: undefined };
  const nextState = applyUIPreviewInteractionResult(state, result);
  return { ...result, nextState };
}

function withState(result: UIPreviewInteractionResult, fallbackState: UIPreviewInteractionState): UIPreviewInteractionResult {
  const nextState = applyUIPreviewInteractionResult(fallbackState, result);
  return { ...result, nextState };
}
