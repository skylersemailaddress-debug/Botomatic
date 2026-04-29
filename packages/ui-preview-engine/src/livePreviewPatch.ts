export type LivePreviewPatchOperationKind = "nodeAdded" | "nodeRemoved" | "nodeMoved" | "nodeUpdated" | "pageAdded" | "pageRemoved" | "themeUpdated" | "validationFailed";
export type LivePreviewPatchOperation = { kind: LivePreviewPatchOperationKind; nodeId?: string; pageId?: string; details?: Record<string, unknown> };
export type LivePreviewPatch = { createdAt: string; operations: LivePreviewPatchOperation[]; claimBoundary: string };
export const LIVE_PREVIEW_PATCH_CAVEAT = "Preview patch is data-only mutation output. It does not render UI, integrate with browser runtime, or sync source files.";
export function createLivePreviewPatch(operations: LivePreviewPatchOperation[], createdAt?: string): LivePreviewPatch { return { createdAt: createdAt ?? new Date().toISOString(), operations, claimBoundary: LIVE_PREVIEW_PATCH_CAVEAT }; }
export function validateLivePreviewPatch(patch: Partial<LivePreviewPatch>): { valid: boolean; issues: string[] } {
  const issues: string[] = [];
  if (!patch.createdAt) issues.push("createdAt missing");
  if (!Array.isArray(patch.operations)) issues.push("operations missing");
  if (!patch.claimBoundary?.includes("data-only")) issues.push("claimBoundary missing");
  const kinds = ["nodeAdded", "nodeRemoved", "nodeMoved", "nodeUpdated", "pageAdded", "pageRemoved", "themeUpdated", "validationFailed"];
  for (const op of patch.operations ?? []) if (!kinds.includes(op.kind)) issues.push(`invalid operation kind: ${op.kind}`);
  return { valid: issues.length === 0, issues };
}
