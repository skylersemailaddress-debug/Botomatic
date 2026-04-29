import { createLivePreviewPatch } from "./livePreviewPatch";
import { cloneEditableUIDocument, createStableNodeId, type EditableUIDocument, validateEditableUIDocument } from "./uiDocumentModel";
import { createUIDocumentDiff, summarizeUIDocumentDiff } from "./uiDocumentDiff";
import { type UIDirectManipulationAction, type UIDirectManipulationResult, validateUIDirectManipulationAction } from "./uiDirectManipulationModel";

export function applyUIDirectManipulation(document: EditableUIDocument, action: UIDirectManipulationAction, context?: { now?: string }): UIDirectManipulationResult {
  if (!action || typeof action !== "object") return invalid(document, ["action must be an object"]);
  if (action.type === "deleteNode" && action.confirm !== true) return { status: "needsConfirmation", nextDocument: document, changedNodeIds: [], diff: { operations: [] }, previewPatch: { operations: [] }, summary: "Delete requires confirmation" };
  const actionValidation = validateUIDirectManipulationAction(action);
  if (!actionValidation.valid) return invalid(document, actionValidation.issues);
  const next = cloneEditableUIDocument(document);
  const page = next.pages.find((p) => p.id === action.pageId);
  const node = page?.nodes[action.nodeId];
  if (!page || !node) return invalid(document, ["unknown page/node id"]);

  if (action.type === "selectNode") return done(next, [], [], [], `Selected ${action.nodeId}`, action.nodeId);

  if (action.type === "deleteNode") {
    if (node.kind === "pageRoot" || page.rootNodeIds.includes(node.id)) return blocked(document, "Cannot delete page root node");
    const idsToDelete = collectSubtree(page.nodes, node.id);
    const set = new Set(idsToDelete);
    if (node.parentId && page.nodes[node.parentId]) page.nodes[node.parentId].childIds = page.nodes[node.parentId].childIds.filter((id) => !set.has(id));
    for (const candidate of Object.values(page.nodes)) {
      candidate.childIds = candidate.childIds.filter((id) => !set.has(id));
      if (candidate.parentId && set.has(candidate.parentId)) candidate.parentId = undefined;
    }
    for (const id of idsToDelete) delete page.nodes[id];
    return finalize(document, next, idsToDelete, `Deleted subtree at ${node.id}`);
  }

  if (action.type === "reorderNode") {
    const parent = page.nodes[action.targetParentId];
    if (!parent) return invalid(document, ["target parent missing"]);
    if (node.parentId && page.nodes[node.parentId] && node.parentId !== parent.id) page.nodes[node.parentId].childIds = page.nodes[node.parentId].childIds.filter((id) => id !== node.id);
    parent.childIds = parent.childIds.filter((id) => id !== node.id);
    const idx = Math.max(0, Math.min(action.targetIndex, parent.childIds.length));
    parent.childIds.splice(idx, 0, node.id);
    node.parentId = parent.id;
    return finalize(document, next, [node.id, parent.id], `Reordered ${node.id}`);
  }

  if (action.type === "moveNode") {
    const parent = page.nodes[action.targetParentId];
    if (!parent) return invalid(document, ["target parent missing"]);
    if (node.parentId && page.nodes[node.parentId]) page.nodes[node.parentId].childIds = page.nodes[node.parentId].childIds.filter((id) => id !== node.id);
    node.parentId = parent.id;
    parent.childIds = parent.childIds.filter((id) => id !== node.id);
    const idx = action.targetIndex === undefined ? parent.childIds.length : Math.max(0, Math.min(action.targetIndex, parent.childIds.length));
    parent.childIds.splice(idx, 0, node.id);
    return finalize(document, next, [node.id, parent.id], `Moved ${node.id}`);
  }

  if (action.type === "resizeNode") {
    if (action.width !== undefined) node.layout.width = action.width as never;
    if (action.height !== undefined) node.layout.height = action.height as never;
    return finalize(document, next, [node.id], `Resized ${node.id}`);
  }

  if (action.type === "editProp") {
    if (action.propName === "style") node.style = { ...(node.style ?? {}), ...((action.value as Record<string, unknown>) ?? {}) } as never;
    else if (action.propName === "width" || action.propName === "height") node.layout[action.propName] = action.value as never;
    else node.props[action.propName] = action.value;
    return finalize(document, next, [node.id], `Edited ${action.propName} on ${node.id}`);
  }

  if (action.type === "duplicateNode") {
    const newId = createStableNodeId([action.idSeed, action.pageId, action.nodeId, "copy"]);
    const now = context?.now ?? "deterministic-now";
    const copy = { ...node, id: newId, childIds: [], props: { ...node.props }, style: { ...node.style }, layout: { ...node.layout }, identity: { ...node.identity, nodeId: newId, updatedAt: now } };
    page.nodes[newId] = copy;
    if (node.parentId && page.nodes[node.parentId]) page.nodes[node.parentId].childIds.push(newId);
    return finalize(document, next, [node.id, newId], `Duplicated ${node.id}`);
  }

  return invalid(document, ["unsupported action"]);
}

function collectSubtree(nodes: EditableUIDocument["pages"][number]["nodes"], startId: string): string[] {
  const out: string[] = [];
  const queue: string[] = [startId];
  while (queue.length) {
    const id = queue.shift()!;
    if (out.includes(id) || !nodes[id]) continue;
    out.push(id);
    queue.push(...nodes[id].childIds);
  }
  return out;
}

function finalize(before: EditableUIDocument, after: EditableUIDocument, changedNodeIds: string[], summary: string): UIDirectManipulationResult {
  const validation = validateEditableUIDocument(after);
  if (!validation.valid) return invalid(before, validation.issues);
  const diff = createUIDocumentDiff(before, after);
  return done(after, changedNodeIds, diff.operations, createLivePreviewPatch(diff.operations as never).operations, `${summary}; ${summarizeUIDocumentDiff(diff)}`);
}
function done(next: EditableUIDocument, changedNodeIds: string[], diffOps: Array<{ kind: string; nodeId?: string; pageId?: string }>, previewOps: Array<{ kind: string; nodeId?: string; pageId?: string }>, summary: string, selectedNodeId?: string): UIDirectManipulationResult {
  return { status: "applied", nextDocument: next, changedNodeIds: [...new Set(changedNodeIds)].sort(), diff: { operations: diffOps }, previewPatch: { operations: previewOps }, summary, selectedNodeId };
}
function invalid(document: EditableUIDocument, issues: string[]): UIDirectManipulationResult { return { status: "invalid", nextDocument: document, changedNodeIds: [], diff: { operations: [] }, previewPatch: { operations: [] }, summary: "Invalid direct manipulation action", issues }; }
function blocked(document: EditableUIDocument, message: string): UIDirectManipulationResult { return { status: "blocked", nextDocument: document, changedNodeIds: [], diff: { operations: [] }, previewPatch: { operations: [] }, summary: message }; }
