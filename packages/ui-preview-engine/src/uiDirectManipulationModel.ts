import type { EditableUIDocument } from "./uiDocumentModel";

export type UIDirectManipulationActionType = "selectNode" | "reorderNode" | "moveNode" | "resizeNode" | "editProp" | "duplicateNode" | "deleteNode";

type UIActionBase = { type: UIDirectManipulationActionType; pageId: string; nodeId: string; confirm?: boolean };
export type UIDragReorderAction = UIActionBase & { type: "reorderNode"; targetParentId: string; targetIndex: number };
export type UIResizeAction = UIActionBase & { type: "resizeNode"; width?: string | number; height?: string | number };
export type UIPropEditAction = UIActionBase & { type: "editProp"; propName: "text" | "label" | "title" | "className" | "style" | "width" | "height"; value: unknown };

export type UIDirectManipulationAction =
  | (UIActionBase & { type: "selectNode" })
  | UIDragReorderAction
  | (UIActionBase & { type: "moveNode"; targetParentId: string; targetIndex?: number })
  | UIResizeAction
  | UIPropEditAction
  | (UIActionBase & { type: "duplicateNode"; idSeed: string })
  | (UIActionBase & { type: "deleteNode" });

export type UIDirectManipulationStatus = "applied" | "blocked" | "needsConfirmation" | "invalid";
export type UIDirectManipulationResult = {
  status: UIDirectManipulationStatus;
  nextDocument: EditableUIDocument;
  changedNodeIds: string[];
  diff: { operations: Array<{ kind: string; nodeId?: string; pageId?: string }> };
  previewPatch: { operations: Array<{ kind: string; nodeId?: string; pageId?: string }> };
  summary: string;
  selectedNodeId?: string;
  issues?: string[];
};


export function validateUIDirectManipulationAction(action: UIDirectManipulationAction): { valid: boolean; issues: string[] } {
  const issues: string[] = [];
  if (!action?.type) issues.push("action.type missing");
  if (!action?.pageId) issues.push("action.pageId missing");
  if (!action?.nodeId) issues.push("action.nodeId missing");
  if (action.type === "reorderNode") {
    if (!action.targetParentId) issues.push("reorderNode.targetParentId missing");
    if (!Number.isInteger(action.targetIndex) || action.targetIndex < 0) issues.push("reorderNode.targetIndex invalid");
  }
  if (action.type === "moveNode" && !action.targetParentId) issues.push("moveNode.targetParentId missing");
  if (action.type === "resizeNode" && action.width === undefined && action.height === undefined) issues.push("resizeNode width/height missing");
  if (action.type === "editProp") {
    const allowed = new Set(["text", "label", "title", "className", "style", "width", "height"]);
    if (!allowed.has(action.propName)) issues.push("editProp.propName not allowed");
  }
  if (action.type === "duplicateNode" && !action.idSeed) issues.push("duplicateNode.idSeed missing");
  return { valid: issues.length === 0, issues };
}
