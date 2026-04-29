import { cloneEditableUIDocument, type EditableUIDocument } from "./uiDocumentModel";
import { type UIEditCommand } from "./uiEditCommand";
import { applyUIEditCommand } from "./uiMutationEngine";
import { createUIDocumentDiff } from "./uiDocumentDiff";
import { runUIEditGuardrails } from "./uiEditGuardrails";
import { createUISourceSyncPlan } from "./uiSourceSyncPlan";
import { appendUIEditHistoryEntry, createUIEditHistoryState, type UIEditHistoryState } from "./uiEditHistory";

export function applyUIEditWorkflow(document: EditableUIDocument, command: UIEditCommand, context?: { now?: string; idSeed?: string; confirmed?: boolean; selection?: any; history?: UIEditHistoryState; responsiveIntent?: string; confirmationMarker?: boolean }) {
  const before = cloneEditableUIDocument(document); const history = context?.history ?? createUIEditHistoryState();
  const mutationResult = applyUIEditCommand(before, command, { now: context?.now, idSeed: context?.idSeed, confirmed: context?.confirmed, selection: context?.selection });
  if (mutationResult.status !== "applied" || !mutationResult.afterDocument) return { status: mutationResult.status, mutationResult, diff: createUIDocumentDiff(before, before), guardrails: runUIEditGuardrails(before, before, mutationResult, context), sourceSyncPlan: { operations: [], affectedPageIds: [], affectedNodeIds: [], caveat: "blocked/invalid workflow has no successful source sync plan.", success: false }, history, currentDocument: before, claimBoundary: "Workflow blocked/invalid/needsResolution. No successful source sync plan. No full source-sync/live-builder/export-readiness claim." };
  const after = mutationResult.afterDocument; const diff = createUIDocumentDiff(before, after); const guardrails = runUIEditGuardrails(before, after, { ...mutationResult, command } as any, context);
  if (guardrails.status === "blocked") return { status: "blocked", mutationResult, diff, guardrails, sourceSyncPlan: { operations: [], affectedPageIds: [], affectedNodeIds: [], caveat: "blocked by guardrails; no successful source sync plan.", success: false }, history, currentDocument: before, claimBoundary: "Workflow blocked by guardrails. No full source sync or export readiness claim." };
  const sourceSyncPlan = createUISourceSyncPlan(diff, after);
  const nextHistory = appendUIEditHistoryEntry(history, { command, beforeDocument: before, afterDocument: after, mutationResult, previewPatch: mutationResult.previewPatch }, { now: context?.now, idSeed: context?.idSeed });
  return { status: "applied", mutationResult, diff, guardrails, sourceSyncPlan, history: nextHistory, currentDocument: cloneEditableUIDocument(after), claimBoundary: "Workflow composes mutation + diff + guardrails + dry-run source sync planning only. No full source-sync/live-builder/export-readiness claim." };
}
