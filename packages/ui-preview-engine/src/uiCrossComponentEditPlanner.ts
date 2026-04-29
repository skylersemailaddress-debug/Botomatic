import path from "path";
import { UI_MULTI_FILE_EDIT_PLAN_CAVEAT, createDeterministicMultiFilePlanId, type UIMultiFileDependency, type UIMultiFileEditOperation, type UIMultiFileEditPlanResult } from "./uiMultiFileEditPlan";
import { type UISourceFileMapping } from "./uiSourceFileMapping";
import { type UISourceIdentityTrackingResult } from "./uiSourceIdentityModel";

const IMPORT_RE = /import\s+(?:[^"']+\s+from\s+)?["']([^"']+)["']/g;
const STYLE_EXT = [".css", ".module.css", ".scss", ".module.scss"];

function listImports(source: string): string[] {
  const out: string[] = [];
  for (const m of source.matchAll(IMPORT_RE)) out.push(m[1]);
  return out;
}

function resolveRelativeImport(fromFile: string, specifier: string, sourceFiles: Record<string, string>): string[] {
  if (!specifier.startsWith(".")) return [];
  const fromDir = path.posix.dirname(fromFile);
  const base = path.posix.normalize(path.posix.join(fromDir, specifier));
  const variants = [base, `${base}.ts`, `${base}.tsx`, `${base}.js`, `${base}.jsx`, `${base}.css`, `${base}.scss`, `${base}/index.ts`, `${base}/index.tsx`, `${base}/index.js`, `${base}/index.jsx`];
  return variants.filter((v, i) => variants.indexOf(v) === i && Object.prototype.hasOwnProperty.call(sourceFiles, v));
}

export function planUICrossComponentEdits(_doc: any, mapping: UISourceFileMapping, identityResult: UISourceIdentityTrackingResult | undefined, requestedEditIntent: any, sourceFiles: Record<string, string>): UIMultiFileEditPlanResult {
  const primary = mapping.targets[0]?.filePath ?? requestedEditIntent?.primaryFile ?? "manual-review";
  const files = new Set<string>([primary, ...(requestedEditIntent?.sharedComponentFiles ?? []), requestedEditIntent?.routeFile, requestedEditIntent?.styleFile].filter(Boolean));
  const dependencies: UIMultiFileDependency[] = [];
  const blockedReasons: string[] = [];
  const pushEdge = (fromFile: string, toFile: string, relation: UIMultiFileDependency["relation"]) => dependencies.push({ dependencyEdgeId: `${fromFile}->${toFile}:${relation}`, fromFile, toFile, relation });

  const routeFile = requestedEditIntent?.routeFile;
  if (routeFile && sourceFiles[routeFile]) {
    const resolved = listImports(sourceFiles[routeFile]).flatMap((s) => resolveRelativeImport(routeFile, s, sourceFiles));
    if (resolved.includes(primary)) pushEdge(routeFile, primary, "route-imports-component");
    else blockedReasons.push("route-to-component dependency unresolved from imports");
  }

  if (sourceFiles[primary]) {
    const imports = listImports(sourceFiles[primary]);
    const resolved = imports.flatMap((s) => resolveRelativeImport(primary, s, sourceFiles));
    for (const child of [...(requestedEditIntent?.sharedComponentFiles ?? [])].sort()) {
      if (resolved.includes(child)) pushEdge(primary, child, "component-imports-child");
      else blockedReasons.push(`component-to-child dependency unresolved from imports: ${child}`);
    }
    const styleResolved = imports.filter((s) => STYLE_EXT.some((ext) => s.endsWith(ext))).flatMap((s) => resolveRelativeImport(primary, s, sourceFiles));
    for (const style of styleResolved.sort()) pushEdge(primary, style, "component-imports-style");
    if ((requestedEditIntent?.styleFile || "") && !styleResolved.includes(requestedEditIntent.styleFile)) blockedReasons.push("component-to-style dependency unresolved from imports");
    for (const f of [...styleResolved, ...resolved]) files.add(f);
  }

  const changedFiles = [...files].sort();
  const operations: UIMultiFileEditOperation[] = [];
  let order = 1;
  for (const child of [...(requestedEditIntent?.sharedComponentFiles ?? [])].sort()) operations.push({ operationId: `op-${order}`, operationOrder: order++, kind: "update", target: { filePath: child, sourceKind: "react", role: "child" }, requiresManualReview: false, multiFileRisk: "low" });
  operations.push({ operationId: `op-${order}`, operationOrder: order++, kind: "update", target: { filePath: primary, sourceKind: "react", role: "parent" }, requiresManualReview: false, multiFileRisk: "low" });
  if (routeFile) operations.push({ operationId: `op-${order}`, operationOrder: order++, kind: "update", target: { filePath: routeFile, sourceKind: "route", role: "route" }, requiresManualReview: false, multiFileRisk: "low", dependencyEdgeId: dependencies.find((d) => d.fromFile === routeFile)?.dependencyEdgeId });
  for (const dep of dependencies.filter((d) => d.relation === "component-imports-style").sort((a, b) => a.toFile.localeCompare(b.toFile))) operations.push({ operationId: `op-${order}`, operationOrder: order++, kind: "update", target: { filePath: dep.toFile, sourceKind: "style", role: "style" }, requiresManualReview: false, multiFileRisk: "low", dependencyEdgeId: dep.dependencyEdgeId });

  let riskLevel: "low" | "medium" | "high" = "low";
  let requiresManualReview = false;
  const missingIdentity = !identityResult?.identities?.find((i) => i.sourceFilePath === primary);
  if (missingIdentity) { requiresManualReview = true; riskLevel = "high"; blockedReasons.push("identity missing"); }
  const missingSource = changedFiles.filter((f) => !(f in sourceFiles));
  if (missingSource.length) { requiresManualReview = true; riskLevel = "high"; blockedReasons.push("source file missing"); }
  if (requestedEditIntent?.ambiguousDependency || blockedReasons.some((b) => b.includes("unresolved"))) { requiresManualReview = true; riskLevel = "high"; blockedReasons.push("dependency ambiguous"); }
  if (requestedEditIntent?.circularDependency) { requiresManualReview = true; riskLevel = "high"; blockedReasons.push("circular dependency detected"); }
  if (changedFiles.length > 5) { requiresManualReview = true; riskLevel = "high"; blockedReasons.push("more than 5 files changed"); }
  if (requestedEditIntent?.destructiveRemoveAcrossFiles) { requiresManualReview = true; riskLevel = "high"; blockedReasons.push("destructive remove spans multiple files"); }

  const planId = createDeterministicMultiFilePlanId(String(requestedEditIntent?.rootIntent ?? "edit"), changedFiles, operations);
  const plan = { planId, rootIntent: String(requestedEditIntent?.rootIntent ?? "edit"), operations, changedFiles, dependencies: dependencies.sort((a,b)=>a.dependencyEdgeId.localeCompare(b.dependencyEdgeId)), riskLevel, requiresManualReview, blockedReasons: [...new Set(blockedReasons)], identityCoverageSummary: missingIdentity ? "identity missing for primary component" : "identity coverage available", caveat: UI_MULTI_FILE_EDIT_PLAN_CAVEAT };
  return { status: plan.blockedReasons.length ? "blocked" : "planned", plan };
}
