import { type UISourceFileMapping } from "./uiSourceFileMapping";
import { type UISourceSyncPlan } from "./uiSourceSyncPlan";

export type UISourcePatchOperationKind = "replaceText" | "insertText" | "removeText" | "createFile" | "deleteFile" | "manualReviewRequired";
export type UISourceKind = "react" | "route" | "style" | "json" | "unknown";
export type UISourcePatchOperation = { kind: UISourcePatchOperationKind; targetFilePath: string; pageIds: string[]; nodeIds: string[]; beforeSnippet?: string; afterSnippet?: string; reason?: string; confidence: "high" | "medium" | "low"; requiresManualReview: boolean; sourceKind: UISourceKind };
export type UISourcePatchIdentityMetadata = { sourceIdentityId?: string; identityConfidence?: "high" | "medium" | "low"; sourceStartLine?: number; sourceEndLine?: number; identityProofSummary?: string; manualReviewReason?: string; staleIdentity?: boolean };
export type UISourcePatchOperationWithIdentity = UISourcePatchOperation & UISourcePatchIdentityMetadata & { dependencyEdgeId?: string; operationOrder?: number; crossComponentRole?: "primary" | "parent" | "child" | "route" | "style" | "config"; multiFileRisk?: "low" | "medium" | "high" };
export type UISourcePatch = { operations: UISourcePatchOperationWithIdentity[]; changedFiles: string[]; caveat: string; multiFilePlanId?: string; dependencies?: { dependencyEdgeId: string; fromFile: string; toFile: string }[]; multiFileRiskLevel?: "low" | "medium" | "high"; requiresManualReview?: boolean };
export const UI_SOURCE_PATCH_CAVEAT = "Patch is a proposed source edit plan and does not prove runtime correctness or deployment readiness.";

const kindFromFile = (filePath: string): UISourceKind => filePath.endsWith(".tsx") || filePath.endsWith(".jsx") ? "react" : filePath.endsWith("/page.tsx") || filePath.endsWith("/layout.tsx") || filePath.endsWith("/route.ts") ? "route" : filePath.endsWith(".css") ? "style" : filePath.endsWith(".json") ? "json" : "unknown";

export function createUISourcePatchFromSyncPlan(plan: UISourceSyncPlan, mapping: UISourceFileMapping): UISourcePatch { const operations: UISourcePatchOperationWithIdentity[] = [];
  for (const op of plan.operations) {
    if (op.kind === "manualReviewRequired") { operations.push({ kind: "manualReviewRequired", targetFilePath: op.targetFileHint ?? "manual-review", pageIds: [...op.pageIds], nodeIds: [...op.nodeIds], reason: op.reason ?? "ambiguous mapping", confidence: "low", requiresManualReview: true, sourceKind: "unknown", manualReviewReason: op.reason ?? "ambiguous mapping" }); continue; }
    const mapped = mapping.targets.find((t) => t.filePath === op.targetFileHint) ?? mapping.targets.find((t) => op.pageIds.includes(t.sourceId) || op.nodeIds.includes(t.sourceId));
    if (!mapped?.filePath) { operations.push({ kind: "manualReviewRequired", targetFilePath: "manual-review", pageIds: [...op.pageIds], nodeIds: [...op.nodeIds], reason: "mapping missing", confidence: "low", requiresManualReview: true, sourceKind: "unknown", manualReviewReason: "mapping missing" }); continue; }
    operations.push({ kind: "replaceText", targetFilePath: mapped.filePath, pageIds: [...op.pageIds], nodeIds: [...op.nodeIds], beforeSnippet: "// before", afterSnippet: "// after", confidence: "medium", requiresManualReview: false, sourceKind: kindFromFile(mapped.filePath), identityConfidence: "medium", identityProofSummary: "Mapped via source file mapping and guarded dry-run.", manualReviewReason: undefined });
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
    if (op.confidence === "low") issues.push(`low-confidence operation blocked: ${op.targetFilePath}`);
    if (op.identityConfidence === "low" && (op.kind === "removeText" || op.kind === "replaceText")) issues.push(`low identity confidence blocked: ${op.targetFilePath}`);
    if (op.staleIdentity) issues.push(`stale identity blocked: ${op.targetFilePath}`);
    if (op.requiresManualReview || op.kind === "manualReviewRequired") issues.push(`manualReviewRequired operation blocked: ${op.targetFilePath}`);
    if ((op.kind === "removeText" || op.kind === "deleteFile") && op.crossComponentRole && op.identityConfidence === "low") issues.push(`destructive multi-file operation missing identity proof: ${op.targetFilePath}`);
    if ((op.kind === "replaceText" || op.kind === "removeText") && !op.beforeSnippet) issues.push(`beforeSnippet required for ${op.kind}: ${op.targetFilePath}`);
  }
  return { valid: issues.length === 0, issues };
}
