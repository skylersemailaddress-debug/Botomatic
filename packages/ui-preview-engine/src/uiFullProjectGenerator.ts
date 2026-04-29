import crypto from "crypto";
import { UI_FULL_PROJECT_GENERATION_CAVEAT, type UIFullProjectFilePlan, type UIFullProjectGenerationFramework, type UIFullProjectGenerationInput, type UIFullProjectGenerationResult, type UIFullProjectNormalizationIssue } from "./uiFullProjectGenerationPlan";
import { detectProjectFileConflicts, normalizeProjectPath, normalizeProjectSlug, sortProjectFilePaths } from "./uiProjectPathNormalizer";

const frameworkFiles: Record<UIFullProjectGenerationFramework, string[]> = {
  next: ["package.json", "app/page.tsx", "app/layout.tsx", "tsconfig.json", "README.md"],
  "vite-react": ["package.json", "src/App.tsx", "src/main.tsx", "index.html", "README.md"],
  "node-api": ["package.json", "src/server.ts", "README.md"],
  unknown: ["README.md"]
};

export function generateUIFullProjectPlan(input: UIFullProjectGenerationInput, options: { framework: UIFullProjectGenerationFramework; rootDir?: string; overwritePolicy?: "fail"|"rename"|"merge"; sourcePatchOperationIds?: string[] }): UIFullProjectGenerationResult {
  const normalizedProjectSlug = normalizeProjectSlug(input.projectName);
  const files: UIFullProjectFilePlan[] = frameworkFiles[options.framework].map((path) => ({ path, source: "framework" }));
  for (const file of input.files ?? []) files.push({ path: file.path, contents: file.contents, source: "projectSpec", placeholderSafe: file.placeholderSafe });
  if (input.editableDocument) files.push({ path: `generated/${normalizedProjectSlug}.ui-document.json`, source: "uiDocument", contents: JSON.stringify(input.editableDocument) });
  if (input.appStructure) files.push({ path: `generated/${normalizedProjectSlug}.app-structure.json`, source: "appStructure", contents: JSON.stringify(input.appStructure) });
  for (const op of input.multiFilePlanResult?.plan?.operations ?? []) {
    if (op.target?.filePath) files.push({ path: op.target.filePath, source: "multiFilePlan", referenceOnly: true });
  }

  const normalizationIssues: UIFullProjectNormalizationIssue[] = [];
  const normalizedFiles: UIFullProjectFilePlan[] = [];
  for (const file of files) {
    const normalized = normalizeProjectPath(file.path);
    if (!normalized.path) {
      normalizationIssues.push(...normalized.issues.map((message): UIFullProjectNormalizationIssue => ({ code: message.includes("absolute") ? "absolute-path" : message.includes("traversal") ? "path-traversal" : message.includes("runtime") ? "reserved-path" : message.includes("unsafe") ? "unsafe-name" : "empty-path", message, filePath: file.path })));
      continue;
    }
    normalizedFiles.push({ ...file, path: normalized.path });
  }

  const conflicts = detectProjectFileConflicts(normalizedFiles);
  normalizationIssues.push(...conflicts);
  const orderedFilePaths = sortProjectFilePaths(normalizedFiles.map((f) => f.path));
  const directories = sortProjectFilePaths(orderedFilePaths.map((p) => p.split("/").slice(0, -1).join("/")).filter(Boolean));
  const blockedReasons = sortProjectFilePaths([...normalizationIssues.map((i) => i.message)]);
  const requiresManualReview = normalizationIssues.length > 0 || conflicts.length > 0;
  const riskLevel = requiresManualReview ? "high" : orderedFilePaths.length > 10 ? "medium" : "low";
  const planSeed = JSON.stringify({ projectName: input.projectName, normalizedProjectSlug, framework: options.framework, orderedFilePaths, overwritePolicy: options.overwritePolicy ?? "fail", rootDir: options.rootDir ?? "", sourcePatchOperationIds: options.sourcePatchOperationIds ?? [], multiFilePlanId: input.multiFilePlanResult?.plan?.planId ?? "" });
  const planId = `full-project-${crypto.createHash("sha256").update(planSeed).digest("hex").slice(0, 16)}`;

  return {
    status: blockedReasons.length ? "blocked" : "planned",
    plan: {
      planId,
      projectName: input.projectName,
      normalizedProjectSlug,
      framework: options.framework,
      files: normalizedFiles.sort((a, b) => a.path.localeCompare(b.path) || a.source.localeCompare(b.source)),
      directories,
      orderedFilePaths,
      conflicts,
      normalizationIssues,
      riskLevel,
      requiresManualReview,
      blockedReasons,
      sourcePatchOperationIds: options.sourcePatchOperationIds,
      multiFilePlanId: input.multiFilePlanResult?.plan?.planId,
      identityCoverageSummary: input.sourceIdentityResult?.summary ?? (input.sourceIdentityResult ? `coverage:${input.sourceIdentityResult.coverageCount ?? 0}` : undefined),
      caveat: UI_FULL_PROJECT_GENERATION_CAVEAT
    }
  };
}
