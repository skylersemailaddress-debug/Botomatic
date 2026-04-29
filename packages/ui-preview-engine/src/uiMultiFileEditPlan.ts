export type UIMultiFileEditRisk = "low" | "medium" | "high";
export type UICrossComponentRole = "primary" | "parent" | "child" | "route" | "style" | "config";

export type UIMultiFileEditTarget = { filePath: string; sourceKind: "react" | "route" | "style" | "config" | "unknown"; role: UICrossComponentRole };
export type UIMultiFileDependency = { dependencyEdgeId: string; fromFile: string; toFile: string; relation: "route-imports-component" | "component-imports-child" | "component-imports-style" | "unknown" };
export type UIMultiFileEditOperation = { operationId: string; operationOrder: number; kind: "create" | "update" | "remove" | "manualReviewRequired"; target: UIMultiFileEditTarget; dependencyEdgeId?: string; requiresManualReview: boolean; multiFileRisk: UIMultiFileEditRisk; reason?: string };
export type UIMultiFileEditPlan = { planId: string; rootIntent: string; operations: UIMultiFileEditOperation[]; changedFiles: string[]; dependencies: UIMultiFileDependency[]; riskLevel: UIMultiFileEditRisk; requiresManualReview: boolean; blockedReasons: string[]; identityCoverageSummary: string; caveat: string };
export type UIMultiFileEditPlanResult = { status: "planned" | "blocked"; plan: UIMultiFileEditPlan };

export const UI_MULTI_FILE_EDIT_PLAN_CAVEAT = "Multi-file edit planning is deterministic dry-run planning and does not perform source writes or prove runtime correctness.";

export function createDeterministicMultiFilePlanId(rootIntent: string, changedFiles: string[], operations: Array<Pick<UIMultiFileEditOperation, "kind" | "operationOrder">>): string {
  const base = `${rootIntent}::${[...changedFiles].sort().join("|")}::${operations.map((o) => `${o.operationOrder}:${o.kind}`).join("|")}`;
  let hash = 0;
  for (let i = 0; i < base.length; i++) hash = (hash * 31 + base.charCodeAt(i)) >>> 0;
  return `mf-plan-${hash.toString(16).padStart(8, "0")}`;
}
