import { type EditableUIDocument, findNodeById } from "./uiDocumentModel";
import { type UIEditCommand } from "./uiEditCommand";
import { type UISelectionContext } from "./uiSelectionState";

export type UIResolvedTarget = { nodeId?: string; pageId?: string; referenceKind: string };
export type UITargetResolutionIssue = { code: string; message: string; candidateNodeIds?: string[] };
export type UITargetResolutionResult = { status: "resolved" | "ambiguous" | "failed"; requiresResolution: boolean; resolvedTarget?: UIResolvedTarget; candidateNodeIds: string[]; issues: UITargetResolutionIssue[]; claimBoundary: string };
export type UITargetResolverContext = UISelectionContext;

const CAVEAT = "Target resolver is data-only and does not mutate documents, render UI, or sync source files.";

export function resolveNodeIdTarget(nodeId: string, document: EditableUIDocument): UITargetResolutionResult {
  const node = findNodeById(document, nodeId);
  if (!node) return { status: "failed", requiresResolution: true, candidateNodeIds: [], issues: [{ code: "node_missing", message: `Node not found: ${nodeId}` }], claimBoundary: CAVEAT };
  return { status: "resolved", requiresResolution: false, resolvedTarget: { nodeId, referenceKind: "nodeId" }, candidateNodeIds: [nodeId], issues: [], claimBoundary: CAVEAT };
}
export function resolvePageTarget(pageId: string, document: EditableUIDocument): UITargetResolutionResult {
  const page = document.pages.find((p) => p.id === pageId);
  if (!page) return { status: "failed", requiresResolution: true, candidateNodeIds: [], issues: [{ code: "page_missing", message: `Page not found: ${pageId}` }], claimBoundary: CAVEAT };
  return { status: "resolved", requiresResolution: false, resolvedTarget: { pageId, referenceKind: "page" }, candidateNodeIds: [], issues: [], claimBoundary: CAVEAT };
}
export function resolveSemanticTarget(referenceKind: "semanticLabel" | "semanticRole", value: string, document: EditableUIDocument): UITargetResolutionResult {
  const ids = document.pages.flatMap((p) => Object.values(p.nodes).filter((n) => (referenceKind === "semanticLabel" ? n.identity.semanticLabel : n.identity.semanticRole) === value).map((n) => n.id));
  if (ids.length === 1) return { status: "resolved", requiresResolution: false, resolvedTarget: { nodeId: ids[0], referenceKind }, candidateNodeIds: ids, issues: [], claimBoundary: CAVEAT };
  if (ids.length > 1) return { status: "ambiguous", requiresResolution: true, candidateNodeIds: ids, issues: [{ code: "ambiguous", message: `Multiple matches for ${referenceKind}`, candidateNodeIds: ids }], claimBoundary: CAVEAT };
  return { status: "failed", requiresResolution: true, candidateNodeIds: [], issues: [{ code: "no_match", message: `No match for ${referenceKind}` }], claimBoundary: CAVEAT };
}

export function resolveUIEditTarget(command: UIEditCommand, document: EditableUIDocument, context?: UITargetResolverContext): UITargetResolutionResult {
  const ref = command.target.reference;
  if (ref.referenceKind === "selectedElement") {
    const selected = context?.selection?.selectedNodeId;
    return selected ? resolveNodeIdTarget(selected, document) : { status: "failed", requiresResolution: true, candidateNodeIds: [], issues: [{ code: "selection_missing", message: "No selected node in context" }], claimBoundary: CAVEAT };
  }
  if (ref.referenceKind === "nodeId" && ref.nodeId) return resolveNodeIdTarget(ref.nodeId, document);
  if (ref.referenceKind === "page" && ref.pageId) return resolvePageTarget(ref.pageId, document);
  if (ref.referenceKind === "semanticLabel") return resolveSemanticTarget("semanticLabel", ref.normalizedReference, document);
  if (ref.referenceKind === "semanticRole") return resolveSemanticTarget("semanticRole", ref.normalizedReference, document);
  return { status: "failed", requiresResolution: true, candidateNodeIds: [], issues: [{ code: "unknown_target", message: `Unsupported target: ${ref.referenceKind}` }], claimBoundary: CAVEAT };
}

export function validateTargetResolution(result: Partial<UITargetResolutionResult>): { valid: boolean; issues: string[] } {
  const issues: string[] = [];
  if (!result.status) issues.push("status missing");
  if (!Array.isArray(result.candidateNodeIds)) issues.push("candidateNodeIds missing");
  if (!Array.isArray(result.issues)) issues.push("issues missing");
  if (!result.claimBoundary?.includes("does not mutate documents")) issues.push("claimBoundary missing");
  return { valid: issues.length === 0, issues };
}
