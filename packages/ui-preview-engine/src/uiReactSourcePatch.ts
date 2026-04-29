import { type UISourceFileMapping } from "./uiSourceFileMapping";
import { type UISourcePatch, type UISourcePatchOperation } from "./uiSourcePatch";
import { type UIReactSourceAnalysis } from "./uiReactSourceAnalyzer";
import { createNextRouteTemplate } from "./uiRouteTemplate";

export function createReactSourcePatchFromUIDiff(diff: any, mapping: UISourceFileMapping, analysis: UIReactSourceAnalysis[], _options: Record<string, unknown> = {}): UISourcePatch {
  const operations: UISourcePatchOperation[] = [];
  const target = mapping.targets[0]?.filePath ?? "manual-review";
  const fileAnalysis = analysis.find((a) => a.filePath === target);
  const changeType = diff?.changeType ?? "replaceTextLiteral";
  if (changeType === "replaceTextLiteral") {
    operations.push({ kind: "replaceText", targetFilePath: target, pageIds: diff.pageIds ?? [], nodeIds: diff.nodeIds ?? [], beforeSnippet: diff.beforeSnippet ?? "Old", afterSnippet: diff.afterSnippet ?? "New", confidence: "high", requiresManualReview: false, sourceKind: "react" });
  } else if (changeType === "removeJsxNode" && !String(diff.identityMarker ?? "").trim()) {
    operations.push({ kind: "manualReviewRequired", targetFilePath: target, pageIds: [], nodeIds: [], reason: "JSX removal requires identity marker/comment/data attribute", confidence: "low", requiresManualReview: true, sourceKind: "react" });
  } else if (changeType === "createPageRoute") {
    const path = diff.targetFilePath ?? "app/new/page.tsx";
    operations.push({ kind: "createFile", targetFilePath: path, pageIds: [], nodeIds: [], afterSnippet: createNextRouteTemplate("page.tsx", diff.routeName ?? "Route"), confidence: "high", requiresManualReview: false, sourceKind: "route", reason: "template creation" });
  } else {
    operations.push({ kind: "manualReviewRequired", targetFilePath: target, pageIds: [], nodeIds: [], reason: `Unsupported or unsafe operation: ${changeType}`, confidence: "low", requiresManualReview: true, sourceKind: fileAnalysis?.isRouteFile ? "route" : "react" });
  }
  const changedFiles = [...new Set(operations.map((o) => o.targetFilePath))];
  return { operations, changedFiles, caveat: "AST-aware dry run patch plan; does not prove runtime correctness." };
}
