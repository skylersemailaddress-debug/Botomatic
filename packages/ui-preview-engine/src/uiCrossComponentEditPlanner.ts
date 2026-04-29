import { UI_MULTI_FILE_EDIT_PLAN_CAVEAT, createDeterministicMultiFilePlanId, type UIMultiFileDependency, type UIMultiFileEditOperation, type UIMultiFileEditPlanResult } from "./uiMultiFileEditPlan";
import { type UISourceFileMapping } from "./uiSourceFileMapping";
import { type UISourceIdentityTrackingResult } from "./uiSourceIdentityModel";

export function planUICrossComponentEdits(_doc: any, mapping: UISourceFileMapping, identityResult: UISourceIdentityTrackingResult | undefined, requestedEditIntent: any, sourceFiles: Record<string, string>): UIMultiFileEditPlanResult {
  const primary = mapping.targets[0]?.filePath ?? requestedEditIntent?.primaryFile ?? "manual-review";
  const files = new Set<string>([primary]);
  for (const child of requestedEditIntent?.sharedComponentFiles ?? []) files.add(child);
  if (requestedEditIntent?.routeFile) files.add(requestedEditIntent.routeFile);
  if (requestedEditIntent?.styleFile) files.add(requestedEditIntent.styleFile);
  const changedFiles = [...files].sort();
  const dependencies: UIMultiFileDependency[] = [];
  const mkEdge = (fromFile: string, toFile: string, relation: UIMultiFileDependency["relation"]) => ({ dependencyEdgeId: `${fromFile}->${toFile}:${relation}`, fromFile, toFile, relation });
  for (const child of requestedEditIntent?.sharedComponentFiles ?? []) dependencies.push(mkEdge(primary, child, "component-imports-child"));
  if (requestedEditIntent?.routeFile) dependencies.push(mkEdge(requestedEditIntent.routeFile, primary, "route-imports-component"));
  if (requestedEditIntent?.styleFile) dependencies.push(mkEdge(primary, requestedEditIntent.styleFile, "component-imports-style"));
  const operations: UIMultiFileEditOperation[] = [];
  let order = 1;
  for (const child of [...(requestedEditIntent?.sharedComponentFiles ?? [])].sort()) operations.push({ operationId: `op-${order}`, operationOrder: order++, kind: "update", target: { filePath: child, sourceKind: "react", role: "child" }, requiresManualReview: false, multiFileRisk: "low" });
  operations.push({ operationId: `op-${order}`, operationOrder: order++, kind: "update", target: { filePath: primary, sourceKind: "react", role: "parent" }, requiresManualReview: false, multiFileRisk: "low" });
  if (requestedEditIntent?.routeFile) operations.push({ operationId: `op-${order}`, operationOrder: order++, kind: "update", target: { filePath: requestedEditIntent.routeFile, sourceKind: "route", role: "route" }, requiresManualReview: false, multiFileRisk: "low", dependencyEdgeId: dependencies.find((d) => d.fromFile === requestedEditIntent.routeFile)?.dependencyEdgeId });
  if (requestedEditIntent?.styleFile) operations.push({ operationId: `op-${order}`, operationOrder: order++, kind: "update", target: { filePath: requestedEditIntent.styleFile, sourceKind: "style", role: "style" }, requiresManualReview: false, multiFileRisk: "low" });

  const blockedReasons: string[] = [];
  let riskLevel: "low" | "medium" | "high" = "low";
  let requiresManualReview = false;
  const missingIdentity = !identityResult?.identities?.find((i) => i.sourceFilePath === primary);
  if (missingIdentity) { requiresManualReview = true; riskLevel = "high"; blockedReasons.push("identity missing"); }
  const missingSource = changedFiles.filter((f) => !(f in sourceFiles));
  if (missingSource.length) { requiresManualReview = true; riskLevel = "high"; blockedReasons.push("source file missing"); }
  if (requestedEditIntent?.ambiguousDependency) { requiresManualReview = true; riskLevel = "high"; blockedReasons.push("dependency ambiguous"); }
  if (requestedEditIntent?.circularDependency) { requiresManualReview = true; riskLevel = "high"; blockedReasons.push("circular dependency detected"); }
  if (changedFiles.length > 5) { requiresManualReview = true; riskLevel = "high"; blockedReasons.push("more than 5 files changed"); }
  if (requestedEditIntent?.destructiveRemoveAcrossFiles) { requiresManualReview = true; riskLevel = "high"; blockedReasons.push("destructive remove spans multiple files"); }

  const planId = createDeterministicMultiFilePlanId(String(requestedEditIntent?.rootIntent ?? "edit"), changedFiles, operations);
  const plan = { planId, rootIntent: String(requestedEditIntent?.rootIntent ?? "edit"), operations, changedFiles, dependencies, riskLevel, requiresManualReview, blockedReasons, identityCoverageSummary: missingIdentity ? "identity missing for primary component" : "identity coverage available", caveat: UI_MULTI_FILE_EDIT_PLAN_CAVEAT };
  return { status: blockedReasons.length ? "blocked" : "planned", plan };
}
