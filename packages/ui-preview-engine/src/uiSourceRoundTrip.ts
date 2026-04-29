import { type EditableUIDocument } from "./uiDocumentModel";
import { type FileSystemAdapter } from "./uiSourceApply";
import { type UISourcePatch } from "./uiSourcePatch";

export type UISourceRoundTripResult = { valid: boolean; changedFiles: string[]; missingMappings: string[]; staleNodeIds: string[]; manualReviewGaps: string[]; issues: string[]; caveat: string };

export function validateUISourceRoundTrip(document: EditableUIDocument, patch: UISourcePatch, _fileSystemAdapter: FileSystemAdapter): UISourceRoundTripResult {
  const pageIds = new Set(document.pages.map((p) => p.id));
  const nodeIds = new Set(document.pages.flatMap((p) => Object.keys(p.nodes)));
  const missingMappings: string[] = [];
  const staleNodeIds: string[] = [];
  const manualReviewGaps: string[] = [];
  for (const op of patch.operations) {
    for (const pid of op.pageIds) if (!pageIds.has(pid)) missingMappings.push(`${op.targetFilePath}:${pid}`);
    for (const nid of op.nodeIds) if (!nodeIds.has(nid)) staleNodeIds.push(`${op.targetFilePath}:${nid}`);
    if (op.kind === "manualReviewRequired") manualReviewGaps.push(op.targetFilePath);
    if (!op.pageIds.length && !op.nodeIds.length && op.kind !== "manualReviewRequired") missingMappings.push(`${op.targetFilePath}:unmapped`);
  }
  const issues = [...missingMappings, ...staleNodeIds, ...manualReviewGaps];
  return { valid: issues.length === 0, changedFiles: patch.changedFiles, missingMappings, staleNodeIds, manualReviewGaps, issues, caveat: "Round-trip validation is conservative and does not make runtime/deploy correctness claims." };
}
