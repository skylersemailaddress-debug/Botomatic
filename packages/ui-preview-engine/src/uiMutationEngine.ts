import { cloneEditableUIDocument, createStableNodeId, findNodeById, type EditableUIDocument, type EditableUINode, validateEditableUIDocument } from "./uiDocumentModel";
import { type UIEditCommand } from "./uiEditCommand";
import { createLivePreviewPatch, type LivePreviewPatch } from "./livePreviewPatch";
import { resolveUIEditTarget, type UITargetResolutionResult } from "./uiTargetResolver";
import { type UISelectionContext } from "./uiSelectionState";

export type UIEditMutationStatus = "applied" | "blocked" | "needsResolution" | "invalid";
export type UIEditMutationIssue = { code: string; message: string };
export type UIEditMutationResult = { status: UIEditMutationStatus; success: boolean; issues: UIEditMutationIssue[]; beforeDocumentId: string; beforeVersion: string; afterDocument?: EditableUIDocument; changedNodeIds: string[]; changedPageIds: string[]; previewPatch: LivePreviewPatch; claimBoundary: string };
const CLAIM = "Mutation engine mutates editable document copies only. previewPatch is data-only. No source-file sync. No browser rendering integration. No full live builder completion claim.";
const HIGH = new Set(["remove", "removePage", "replace", "bindData", "bindAction", "connectForm"]);

function apply(doc: EditableUIDocument, command: UIEditCommand, resolution?: UITargetResolutionResult): { doc: EditableUIDocument; ops: any[]; changedNodes: string[]; changedPages: string[] } {
  const out = cloneEditableUIDocument(doc); const ops: any[] = []; const changedNodes: string[] = []; const changedPages: string[] = [];
  const targetNodeId = resolution?.resolvedTarget?.nodeId;
  if (command.kind === "retheme") { out.theme = { ...out.theme, ...command.payload }; ops.push({ kind: "themeUpdated" }); return { doc: out, ops, changedNodes, changedPages }; }
  if (command.kind === "addPage") { const id = command.target.reference.pageId ?? createStableNodeId(["page", String(command.payload.value ?? "new")]); out.pages.push({ id, route: `/${id}`, name: id, title: id, rootNodeIds: [], nodes: {} }); ops.push({ kind: "pageAdded", pageId: id }); changedPages.push(id); return { doc: out, ops, changedNodes, changedPages }; }
  if (command.kind === "removePage") { const id = command.target.reference.pageId; out.pages = out.pages.filter((p) => p.id !== id); ops.push({ kind: "pageRemoved", pageId: id }); changedPages.push(id!); return { doc: out, ops, changedNodes, changedPages }; }
  const page = out.pages.find((p) => targetNodeId && p.nodes[targetNodeId]); if (!page || !targetNodeId) return { doc: out, ops, changedNodes, changedPages };
  const node = page.nodes[targetNodeId]!;
  if (command.kind === "remove") { if (node.parentId) page.nodes[node.parentId].childIds = page.nodes[node.parentId].childIds.filter((id) => id !== node.id); delete page.nodes[node.id]; ops.push({ kind: "nodeRemoved", nodeId: node.id }); changedNodes.push(node.id); }
  if (command.kind === "duplicate") { const id = `${node.id}::copy`; const copy: EditableUINode = { ...node, id, identity: { ...node.identity, nodeId: id, createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() } }; page.nodes[id] = copy; if (node.parentId) page.nodes[node.parentId].childIds.push(id); ops.push({ kind: "nodeAdded", nodeId: id }); changedNodes.push(id); }
  if (command.kind === "move") { const dest = resolution?.resolvedTarget?.nodeId ?? node.parentId; if (node.parentId) page.nodes[node.parentId].childIds = page.nodes[node.parentId].childIds.filter((id) => id !== node.id); node.parentId = dest; if (dest && page.nodes[dest]) page.nodes[dest].childIds.push(node.id); ops.push({ kind: "nodeMoved", nodeId: node.id }); changedNodes.push(node.id); }
  if (command.kind === "rewriteText") { node.props = { ...node.props, text: command.payload.value ?? command.payload.quote ?? "" }; ops.push({ kind: "nodeUpdated", nodeId: node.id }); changedNodes.push(node.id); }
  if (command.kind === "restyle") { node.style = { ...node.style, ...(command.payload as any) }; ops.push({ kind: "nodeUpdated", nodeId: node.id }); changedNodes.push(node.id); }
  if (command.kind === "changeLayout") { node.layout = { ...node.layout, ...(command.payload as any) }; ops.push({ kind: "nodeUpdated", nodeId: node.id }); changedNodes.push(node.id); }
  if (command.kind === "bindData") { node.bindings = [...node.bindings, { key: "data", source: String(command.payload.value ?? "unknown") }]; ops.push({ kind: "nodeUpdated", nodeId: node.id }); changedNodes.push(node.id); }
  if (command.kind === "bindAction") { node.actionBindings = [...node.actionBindings, { trigger: "click", action: String(command.payload.value ?? "unknown") }]; ops.push({ kind: "nodeUpdated", nodeId: node.id }); changedNodes.push(node.id); }
  if (command.kind === "connectForm") { node.formBindings = [...node.formBindings, { formId: "form", field: "email", source: String(command.payload.value ?? "unknown") }]; ops.push({ kind: "nodeUpdated", nodeId: node.id }); changedNodes.push(node.id); }
  if (command.kind === "add") { const id = createStableNodeId(["generic", node.id, String(Date.now())]); page.nodes[id] = { ...node, id, childIds: [], identity: { ...node.identity, nodeId: id, semanticLabel: String(command.payload.value ?? "generic component"), createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() } }; node.childIds.push(id); page.nodes[id].parentId = node.id; ops.push({ kind: "nodeAdded", nodeId: id }); changedNodes.push(id); }
  if (command.kind === "replace") { const id = node.id; page.nodes[id] = { ...node, kind: "component", identity: { ...node.identity, semanticLabel: String(command.payload.replacement ?? "replacement") } }; ops.push({ kind: "nodeUpdated", nodeId: id }); changedNodes.push(id); }
  return { doc: out, ops, changedNodes, changedPages };
}

export function applyUIEditCommand(document: EditableUIDocument, command: UIEditCommand, context?: UISelectionContext): UIEditMutationResult {
  const inputValid = validateEditableUIDocument(document); if (!inputValid.valid) return { status: "invalid", success: false, issues: inputValid.issues.map((m) => ({ code: "invalid_document", message: m })), beforeDocumentId: document.id, beforeVersion: document.version, changedNodeIds: [], changedPageIds: [], previewPatch: createLivePreviewPatch([{ kind: "validationFailed" }]), claimBoundary: CLAIM };
  const resolution = resolveUIEditTarget(command, document, context);
  if ((command.safety.requiresResolution || resolution.requiresResolution) && resolution.status !== "resolved" && command.kind !== "addPage" && command.kind !== "retheme") return { status: "needsResolution", success: false, issues: [{ code: "needs_resolution", message: "Target requires resolution" }], beforeDocumentId: document.id, beforeVersion: document.version, changedNodeIds: [], changedPageIds: [], previewPatch: createLivePreviewPatch([]), claimBoundary: CLAIM };
  if ((command.safety.requiresConfirmation || HIGH.has(command.kind)) && context?.confirmed !== true) return { status: "blocked", success: false, issues: [{ code: "confirmation_required", message: "Command requires confirmation" }], beforeDocumentId: document.id, beforeVersion: document.version, changedNodeIds: [], changedPageIds: [], previewPatch: createLivePreviewPatch([]), claimBoundary: CLAIM };
  return applyResolvedUIEditCommand(document, command, resolution);
}

export function applyResolvedUIEditCommand(document: EditableUIDocument, command: UIEditCommand, resolution: UITargetResolutionResult): UIEditMutationResult {
  const { doc, ops, changedNodes, changedPages } = apply(document, command, resolution);
  const outValid = validateEditableUIDocument(doc);
  const status: UIEditMutationStatus = outValid.valid ? "applied" : "invalid";
  return { status, success: outValid.valid, issues: outValid.issues.map((m) => ({ code: "invalid_output", message: m })), beforeDocumentId: document.id, beforeVersion: document.version, afterDocument: outValid.valid ? doc : undefined, changedNodeIds: changedNodes, changedPageIds: changedPages, previewPatch: createLivePreviewPatch(ops), claimBoundary: CLAIM };
}

export function validateUIEditMutationResult(result: Partial<UIEditMutationResult>): { valid: boolean; issues: string[] } { const issues: string[] = []; if (!result.status) issues.push("status missing"); if (typeof result.success !== "boolean") issues.push("success missing"); if (!result.claimBoundary?.includes("No source-file sync")) issues.push("claimBoundary missing"); return { valid: issues.length === 0, issues }; }
