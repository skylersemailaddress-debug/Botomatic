import { type UISourceFileMapping } from "./uiSourceFileMapping";
import { type UISourcePatch, type UISourcePatchOperation } from "./uiSourcePatch";
import { type UIReactSourceAnalysis } from "./uiReactSourceAnalyzer";
import { createNextRouteTemplate } from "./uiRouteTemplate";
import { trackUISourceIdentities } from "./uiSourceIdentityTracker";
import { type UISourceIdentityTrackingResult } from "./uiSourceIdentityModel";

export function createReactSourcePatchFromUIDiff(diff: any, mapping: UISourceFileMapping, analysis: UIReactSourceAnalysis[], options: { sourceFiles?: Record<string, string>; identityResult?: UISourceIdentityTrackingResult } = {}): UISourcePatch {
  const operations: UISourcePatchOperation[] = [];
  const target = mapping.targets[0]?.filePath ?? "manual-review";
  const tracked = options.identityResult ?? (options.sourceFiles ? trackUISourceIdentities(options.sourceFiles) : undefined);
  const identity = tracked?.identities.find((i) => i.sourceFilePath === target);
  const fileAnalysis = analysis.find((a) => a.filePath === target);
  const changeType = diff?.changeType ?? "replaceTextLiteral";
  if (changeType === "replaceTextLiteral") {
    operations.push({ kind: "replaceText", targetFilePath: target, pageIds: diff.pageIds ?? [], nodeIds: diff.nodeIds ?? [], beforeSnippet: diff.beforeSnippet ?? "Old", afterSnippet: diff.afterSnippet ?? "New", confidence: "high", requiresManualReview: !identity, sourceKind: "react", sourceIdentityId: identity?.identityId, identityConfidence: identity?.confidence ?? "low", sourceStartLine: identity?.sourceStartLine, sourceEndLine: identity?.sourceEndLine, identityProofSummary: identity ? "Parser-backed TSX identity match for target JSX node." : undefined, manualReviewReason: identity ? undefined : "missing source identity for replace operation" });
  } else if (changeType === "removeJsxNode") {
    if (!identity || identity.confidence === "low" || diff.staleIdentity) {
      operations.push({ kind: "manualReviewRequired", targetFilePath: target, pageIds: diff.pageIds ?? [], nodeIds: diff.nodeIds ?? [], reason: "JSX removal requires verified source identity", confidence: "low", requiresManualReview: true, sourceKind: "react", sourceIdentityId: identity?.identityId, identityConfidence: diff.staleIdentity ? "low" : identity?.confidence ?? "low", sourceStartLine: identity?.sourceStartLine, sourceEndLine: identity?.sourceEndLine, manualReviewReason: diff.staleIdentity ? "stale source identity for remove operation" : "missing/low source identity for remove operation", staleIdentity: Boolean(diff.staleIdentity) });
    } else if (!String(diff.identityMarker ?? "").trim()) {
    operations.push({ kind: "manualReviewRequired", targetFilePath: target, pageIds: [], nodeIds: [], reason: "JSX removal requires identity marker/comment/data attribute", confidence: "low", requiresManualReview: true, sourceKind: "react", identityConfidence: "low", manualReviewReason: "missing source identity for remove operation" });
    } else {
      operations.push({ kind: "removeText", targetFilePath: target, pageIds: diff.pageIds ?? [], nodeIds: diff.nodeIds ?? [], beforeSnippet: diff.beforeSnippet ?? "<node />", confidence: "high", requiresManualReview: false, sourceKind: "react", sourceIdentityId: identity.identityId, identityConfidence: identity.confidence, sourceStartLine: identity.sourceStartLine, sourceEndLine: identity.sourceEndLine, identityProofSummary: "Parser-backed TSX identity match for remove operation." });
    }
  } else if (changeType === "createPageRoute") {
    const path = diff.targetFilePath ?? "app/new/page.tsx";
    operations.push({ kind: "createFile", targetFilePath: path, pageIds: [], nodeIds: [], afterSnippet: createNextRouteTemplate("page.tsx", diff.routeName ?? "Route"), confidence: "high", requiresManualReview: false, sourceKind: "route", reason: "template creation", sourceIdentityId: `created-file:${path}`, identityConfidence: "high", identityProofSummary: "Explicit created-file identity for route template." });
  } else {
    operations.push({ kind: "manualReviewRequired", targetFilePath: target, pageIds: [], nodeIds: [], reason: `Unsupported or unsafe operation: ${changeType}`, confidence: "low", requiresManualReview: true, sourceKind: fileAnalysis?.isRouteFile ? "route" : "react" });
  }
  const changedFiles = [...new Set(operations.map((o) => o.targetFilePath))];
  return { operations, changedFiles, caveat: "AST-aware dry run patch plan; does not prove runtime correctness." };
}
