import { cloneEditableUIDocument, type EditableUIDocument, validateEditableUIDocument } from "./uiDocumentModel";
import { type UIEditCommand } from "./uiEditCommand";
import { type UIEditMutationResult } from "./uiMutationEngine";
import { type LivePreviewPatch } from "./livePreviewPatch";

export type UIEditHistoryEntry = { id: string; command: UIEditCommand; beforeDocument: EditableUIDocument; afterDocument: EditableUIDocument; mutationResult: UIEditMutationResult; previewPatch: LivePreviewPatch; createdAt: string; claimBoundary: string };
export type UIEditHistoryState = { entries: UIEditHistoryEntry[]; pointer: number; claimBoundary: string };
export type UIEditHistoryAction = "append" | "undo" | "redo";
export type UIEditHistoryValidationResult = { valid: boolean; issues: string[] };
export const UI_EDIT_HISTORY_CAVEAT = "UI edit history tracks reversible document snapshots and preview patches only. It does not sync source files and does not claim full live UI builder completion/readiness.";

export function createUIEditHistoryState(): UIEditHistoryState { return { entries: [], pointer: -1, claimBoundary: UI_EDIT_HISTORY_CAVEAT }; }
export function appendUIEditHistoryEntry(state: UIEditHistoryState, entry: Omit<UIEditHistoryEntry, "id" | "createdAt" | "claimBoundary">, context?: { now?: string; idSeed?: string }): UIEditHistoryState {
  const createdAt = context?.now ?? new Date().toISOString(); const id = `uiehist:${(context?.idSeed ?? entry.command.id).replace(/[^a-z0-9:-]/gi, "-")}:${createdAt.replace(/[^0-9]/g, "").slice(0, 14)}`;
  const nextEntry: UIEditHistoryEntry = { id, ...entry, beforeDocument: cloneEditableUIDocument(entry.beforeDocument), afterDocument: cloneEditableUIDocument(entry.afterDocument), createdAt, claimBoundary: UI_EDIT_HISTORY_CAVEAT };
  const baseEntries = state.entries.slice(0, state.pointer + 1);
  return { entries: [...baseEntries, nextEntry], pointer: baseEntries.length, claimBoundary: UI_EDIT_HISTORY_CAVEAT };
}
export function undoUIEditHistory(state: UIEditHistoryState): { document?: EditableUIDocument; pointer: number } { if (state.pointer < 0) return { pointer: state.pointer }; return { document: cloneEditableUIDocument(state.entries[state.pointer].beforeDocument), pointer: state.pointer - 1 }; }
export function redoUIEditHistory(state: UIEditHistoryState): { document?: EditableUIDocument; pointer: number } { const next = state.pointer + 1; if (next >= state.entries.length) return { pointer: state.pointer }; return { document: cloneEditableUIDocument(state.entries[next].afterDocument), pointer: next }; }
export function validateUIEditHistoryState(state: Partial<UIEditHistoryState>): UIEditHistoryValidationResult { const issues: string[] = []; if (!Array.isArray(state.entries)) issues.push("entries missing"); if (typeof state.pointer !== "number") issues.push("pointer missing"); if (!state.claimBoundary?.includes("does not sync source files")) issues.push("claimBoundary missing"); for (const e of state.entries ?? []) { if (!e.command || !e.previewPatch || !e.mutationResult) issues.push("entry shape invalid"); if (!validateEditableUIDocument(e.beforeDocument).valid || !validateEditableUIDocument(e.afterDocument).valid) issues.push("entry documents invalid"); } return { valid: issues.length === 0, issues }; }
