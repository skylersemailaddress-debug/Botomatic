import { cloneEditableUIDocument, type EditableUIDocument } from "./uiDocumentModel";
import { createUIEditHistoryState, type UIEditHistoryState } from "./uiEditHistory";
import { createUISelectionState, type UISelectionState, validateUISelectionState } from "./uiSelectionState";

export type UIPreviewInteractionStatus = "idle" | "needsResolution" | "needsConfirmation" | "applied" | "blocked" | "invalid";
export type UIPreviewInteractionMode = "typedChat" | "spokenChat" | "selectionOnly";
export type UIPreviewInteractionReviewState = { required: boolean; payload?: any; command?: any; selectionSnapshot?: UISelectionState; selectedNodeId?: string; selectedPageId?: string };
export type UIPreviewInteractionValidationResult = { valid: boolean; issues: string[] };
export type UIPreviewInteractionState = {
  editableDocument: EditableUIDocument;
  selection: UISelectionState;
  history: UIEditHistoryState;
  lastCommand?: any;
  lastWorkflowResult?: any;
  lastPreviewPatch?: any;
  pendingReview?: UIPreviewInteractionReviewState;
  sourceSyncPlan?: any;
  guardrailSummary?: string;
  status: UIPreviewInteractionStatus;
  claimBoundary: string;
};
const CLAIM = "Preview interaction state tracks editable preview model workflows only. Source sync is planning-only; no full live-builder/source-sync/export-readiness claim.";

export function createUIPreviewInteractionState(editableDocument: EditableUIDocument, input?: Partial<UIPreviewInteractionState>): UIPreviewInteractionState {
  return {
    editableDocument: cloneEditableUIDocument(editableDocument),
    selection: input?.selection ?? createUISelectionState({ source: "system", now: "2026-01-01T00:00:00.000Z" }),
    history: input?.history ?? createUIEditHistoryState(),
    lastCommand: input?.lastCommand,
    lastWorkflowResult: input?.lastWorkflowResult,
    lastPreviewPatch: input?.lastPreviewPatch,
    pendingReview: input?.pendingReview,
    sourceSyncPlan: input?.sourceSyncPlan,
    guardrailSummary: input?.guardrailSummary,
    status: input?.status ?? "idle",
    claimBoundary: CLAIM,
  };
}

export function updateUIPreviewSelection(state: UIPreviewInteractionState, selectionInput: Partial<UISelectionState>): UIPreviewInteractionState {
  return { ...state, selection: { ...state.selection, ...selectionInput, updatedAt: selectionInput.updatedAt ?? state.selection.updatedAt } };
}

export function applyUIPreviewInteractionResult(state: UIPreviewInteractionState, result: any): UIPreviewInteractionState {
  return {
    ...state,
    editableDocument: cloneEditableUIDocument(result.editableDocument ?? state.editableDocument),
    history: result.history ?? state.history,
    lastCommand: result.command ?? state.lastCommand,
    lastWorkflowResult: result.workflowResult ?? state.lastWorkflowResult,
    lastPreviewPatch: result.previewPatch ?? state.lastPreviewPatch,
    pendingReview: result.pendingReview,
    sourceSyncPlan: result.sourceSyncPlan ?? state.sourceSyncPlan,
    guardrailSummary: result.guardrails ? `${result.guardrails.status}` : state.guardrailSummary,
    status: result.status ?? state.status,
  };
}

export function validateUIPreviewInteractionState(state: Partial<UIPreviewInteractionState>): UIPreviewInteractionValidationResult {
  const issues: string[] = [];
  if (!state.editableDocument) issues.push("editableDocument missing");
  if (!state.selection || !validateUISelectionState(state.selection).valid) issues.push("selection invalid");
  if (!state.history) issues.push("history missing");
  if (!state.claimBoundary?.includes("planning-only")) issues.push("claimBoundary missing");
  return { valid: issues.length === 0, issues };
}
