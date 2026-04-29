export type UISelectionSource = "chat" | "click" | "keyboard" | "spokenChat" | "system" | "testFixture";
export type UISelectionBoundingBox = { x: number; y: number; width: number; height: number };
export type UISelectionState = {
  selectedNodeId?: string;
  selectedPageId?: string;
  inspectedNodeId?: string;
  semanticLabel?: string;
  source: UISelectionSource;
  boundingBox?: UISelectionBoundingBox;
  createdAt: string;
  updatedAt: string;
  caveat: string;
};
export type UISelectionContext = { selection?: UISelectionState; confirmed?: boolean };
export type UISelectionValidationResult = { valid: boolean; issues: string[] };

export const UI_SELECTION_STATE_CAVEAT = "Selection/inspect state is a data-only contract for resolver/mutation workflows. It does not implement UI interactions, rendering, browser integration, or source-file sync.";

export function createUISelectionState(input: Omit<Partial<UISelectionState>, "createdAt" | "updatedAt" | "caveat"> & { source?: UISelectionSource; now?: string }): UISelectionState {
  const now = input.now ?? new Date().toISOString();
  return { selectedNodeId: input.selectedNodeId, selectedPageId: input.selectedPageId, inspectedNodeId: input.inspectedNodeId, semanticLabel: input.semanticLabel, source: input.source ?? "system", boundingBox: input.boundingBox, createdAt: now, updatedAt: now, caveat: UI_SELECTION_STATE_CAVEAT };
}

export function clearUISelection(selection: UISelectionState, now?: string): UISelectionState {
  return { ...selection, selectedNodeId: undefined, selectedPageId: undefined, inspectedNodeId: undefined, semanticLabel: undefined, boundingBox: undefined, updatedAt: now ?? new Date().toISOString() };
}

export function validateUISelectionState(selection: Partial<UISelectionState>): UISelectionValidationResult {
  const issues: string[] = [];
  if (!selection || typeof selection !== "object") return { valid: false, issues: ["selection must be an object"] };
  if (!selection.source || !["chat", "click", "keyboard", "spokenChat", "system", "testFixture"].includes(selection.source)) issues.push("source invalid");
  if (!selection.createdAt) issues.push("createdAt missing");
  if (!selection.updatedAt) issues.push("updatedAt missing");
  if (!selection.caveat?.toLowerCase().includes("data-only contract")) issues.push("caveat missing");
  return { valid: issues.length === 0, issues };
}
