import { cloneEditableUIDocument, type EditableUIDocument } from "./uiDocumentModel";
import { type UIEditCommand } from "./uiEditCommand";
import { applyUIEditCommand } from "./uiMutationEngine";
import { createUIDocumentDiff } from "./uiDocumentDiff";
import { runUIEditGuardrails } from "./uiEditGuardrails";
import { createUISourceSyncPlan } from "./uiSourceSyncPlan";
import { appendUIEditHistoryEntry, createUIEditHistoryState, type UIEditHistoryState } from "./uiEditHistory";

export type UIEditWorkflowContext = { now?: string; idSeed?: string; confirmed?: boolean; selection?: { selectedNodeId?: string }; history?: UIEditHistoryState; responsiveIntent?: string; confirmationMarker?: boolean };
const CLAIM = "Workflow composes mutation + diff + guardrails + dry-run source sync planning only. No full source-sync/live-builder/export-readiness claim.";

export function applyUIEditWorkflow(document: EditableUIDocument, command: UIEditCommand, context?: UIEditWorkflowContext) {
  const before = (() => { try { return cloneEditableUIDocument(document); } catch { return JSON.parse(JSON.stringify(document)) as EditableUIDocument; } })();
  const history = context?.history ?? createUIEditHistoryState();
  const mutationResult = applyUIEditCommand(before, command, { now: context?.now, idSeed: context?.idSeed, confirmed: context?.confirmed, selection: context?.selection as any });

  if (mutationResult.status !== "applied" || !mutationResult.afterDocument) {
    return { status: mutationResult.status, mutationResult, diff: { operations: [], changedNodeIds: [], changedPageIds: [] }, guardrails: { valid: mutationResult.status !== "invalid", status: mutationResult.status === "invalid" ? "blocked" : "ok", issues: mutationResult.status === "invalid" ? [{ code: "invalid_output", severity: "blocker", message: "mutation output invalid" }] : [], claimBoundary: "Guardrails skipped because mutation did not apply." }, sourceSyncPlan: { operations: [], affectedPageIds: [], affectedNodeIds: [], caveat: "Workflow result is non-executable planning-only because mutation did not apply.", success: false }, history, currentDocument: before, claimBoundary: CLAIM };
  }

  const after = mutationResult.afterDocument;
  const diff = createUIDocumentDiff(before, after);
  const guardrails = runUIEditGuardrails(before, after, { ...mutationResult, command } as any, context);
  const guardrailBlocked = guardrails.issues.some((i) => i.severity === "blocker") || guardrails.status === "blocked";
  if (guardrailBlocked) return { status: "blocked", mutationResult, diff, guardrails, sourceSyncPlan: { operations: [], affectedPageIds: [], affectedNodeIds: [], caveat: "Workflow result is non-executable planning-only because guardrails blocked the edit.", success: false }, history, currentDocument: before, claimBoundary: CLAIM };

  const sourceSyncPlan = createUISourceSyncPlan(diff, after);
  const nextHistory = appendUIEditHistoryEntry(history, { command, beforeDocument: before, afterDocument: after, mutationResult, previewPatch: mutationResult.previewPatch }, { now: context?.now, idSeed: context?.idSeed });
  return { status: "applied", mutationResult, diff, guardrails, sourceSyncPlan, history: nextHistory, currentDocument: cloneEditableUIDocument(after), claimBoundary: CLAIM };
}
