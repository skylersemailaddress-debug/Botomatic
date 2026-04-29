export type UIFullProjectGenerationFramework = "next" | "vite-react" | "node-api" | "unknown";
export type UIFullProjectGenerationRisk = "low" | "medium" | "high";

export type UIFullProjectNormalizationIssue = {
  code: "empty-path" | "absolute-path" | "path-traversal" | "reserved-path" | "unsafe-name" | "duplicate-path" | "secret-path";
  message: string;
  filePath?: string;
};

export type UIFullProjectFilePlan = {
  path: string;
  contents?: string;
  source: "framework" | "projectSpec" | "uiDocument" | "appStructure" | "multiFilePlan";
  placeholderSafe?: boolean;
  referenceOnly?: boolean;
};

export type UIFullProjectGenerationInput = {
  projectName: string;
  files?: Array<{ path: string; contents?: string; placeholderSafe?: boolean }>;
  editableDocument?: { id?: string; version?: string };
  appStructure?: { rootName?: string; nodes?: Array<{ id?: string; pathHint?: string }> };
  sourceIdentityResult?: { summary?: string; coverageCount?: number };
  multiFilePlanResult?: { plan?: { planId?: string; operations?: Array<{ operationId?: string; target?: { filePath?: string } }> } };
};

export type UIFullProjectGenerationPlan = {
  planId: string;
  projectName: string;
  normalizedProjectSlug: string;
  framework: UIFullProjectGenerationFramework;
  files: UIFullProjectFilePlan[];
  directories: string[];
  orderedFilePaths: string[];
  conflicts: UIFullProjectNormalizationIssue[];
  normalizationIssues: UIFullProjectNormalizationIssue[];
  riskLevel: UIFullProjectGenerationRisk;
  requiresManualReview: boolean;
  blockedReasons: string[];
  sourcePatchOperationIds?: string[];
  multiFilePlanId?: string;
  identityCoverageSummary?: string;
  caveat: "Full project generation is deterministic dry-run planning and does not write files, install dependencies, deploy, or prove runtime correctness.";
};

export type UIFullProjectGenerationResult = {
  status: "planned" | "blocked";
  plan: UIFullProjectGenerationPlan;
};

export const UI_FULL_PROJECT_GENERATION_CAVEAT = "Full project generation is deterministic dry-run planning and does not write files, install dependencies, deploy, or prove runtime correctness." as const;
