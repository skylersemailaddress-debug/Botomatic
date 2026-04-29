import { type UISourceFileMapping } from "./uiSourceFileMapping";
import { type UISourceSyncPlan } from "./uiSourceSyncPlan";

export type UISourcePatchOperationKind = "replaceText" | "insertText" | "removeText" | "createFile" | "deleteFile" | "manualReviewRequired";
export type UISourcePatchOperation = { kind: UISourcePatchOperationKind; targetFilePath: string; pageIds: string[]; nodeIds: string[]; beforeSnippet?: string; afterSnippet?: string; reason?: string };
export type UISourcePatch = { operations: UISourcePatchOperation[]; changedFiles: string[]; caveat: string };
export const UI_SOURCE_PATCH_CAVEAT = "Patch is a proposed source edit plan and does not prove runtime correctness or deployment readiness.";

export function createUISourcePatchFromSyncPlan(plan: UISourceSyncPlan, mapping: UISourceFileMapping): UISourcePatch {
  const operations: UISourcePatchOperation[] = [];
  for (const op of plan.operations) {
    if (op.kind === "manualReviewRequired") {
      operations.push({ kind: "manualReviewRequired", targetFilePath: op.targetFileHint ?? "manual-review", pageIds: [...op.pageIds], nodeIds: [...op.nodeIds], reason: op.reason ?? "ambiguous mapping" });
      continue;
    }
    const hint = op.targetFileHint;
    const mapped = mapping.targets.find((t) => t.filePath === hint) ?? mapping.targets.find((t) => op.pageIds.includes(t.sourceId) || op.nodeIds.includes(t.sourceId));
    if (!mapped?.filePath) {
      operations.push({ kind: "manualReviewRequired", targetFilePath: "manual-review", pageIds: [...op.pageIds], nodeIds: [...op.nodeIds], reason: "mapping missing" });
      continue;
    }
    operations.push({ kind: "replaceText", targetFilePath: mapped.filePath, pageIds: [...op.pageIds], nodeIds: [...op.nodeIds], beforeSnippet: "// before", afterSnippet: "// after" });
  }
  for (const item of mapping.manualReviewRequired) {
    operations.push({ kind: "manualReviewRequired", targetFilePath: item.filePath ?? "manual-review", pageIds: [], nodeIds: [item.sourceId], reason: item.reason ?? "manual mapping" });
  }
  const changedFiles = [...new Set(operations.map((o) => o.targetFilePath))].sort((a, b) => a.localeCompare(b));
  return { operations, changedFiles, caveat: UI_SOURCE_PATCH_CAVEAT };
}

export function validateUISourcePatch(patch: UISourcePatch): { valid: boolean; issues: string[] } {
  const issues: string[] = [];
  if (!Array.isArray(patch?.operations)) issues.push("operations missing");
  if (!patch?.caveat?.includes("proposed source edit plan")) issues.push("caveat missing");
  for (const op of patch?.operations ?? []) {
    if (!op.targetFilePath) issues.push("operation missing targetFilePath");
  }
  return { valid: issues.length === 0, issues };
}
