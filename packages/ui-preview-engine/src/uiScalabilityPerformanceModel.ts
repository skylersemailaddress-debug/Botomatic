export type UIScalabilityPerformanceRisk = "low" | "medium" | "high";
export type UIScalabilityPerformanceMetric = { name: string; warning: number; high: number; value: number };
export type UIScalabilityPerformanceThreshold = { documentNodes: { warning: number; high: number }; sourceFiles: { warning: number; high: number }; totalSourceBytes: { warning: number; high: number }; operations: { warning: number; high: number; safeLimit: number }; generatedFiles: { warning: number; high: number } };
export type UIScalabilityPerformanceIssue = { code: string; message: string; severity: UIScalabilityPerformanceRisk };
export type UIScalabilityChunkPlan = { documentChunks: { startNodeIndex: number; endNodeIndex: number }[]; sourceFileChunks: { filePaths: string[]; totalBytes: number }[]; operationChunks: { startOperationIndex: number; endOperationIndex: number }[]; recommendedChunkCount: number };
export type UIScalabilityIndexPlan = { recommendations: { key: string; enabled: boolean; reason: string }[]; recommendedIndexCount: number };
export type UIScalabilityPaginationPlan = { recommendations: { key: string; enabled: boolean; count: number }[]; recommendedPaginationCount: number };
export type UIScalabilityPerformanceInput = { editableDocument?: unknown; sourceFiles?: Record<string, string>; sourceIdentityResult?: any; multiFilePlan?: any; fullProjectGenerationPlan?: any; stylePlan?: any; dataStateApiWiringPlan?: any; reliabilityRepairPlan?: any; sourcePatchPlan?: any };
export type UIScalabilityPerformancePlan = {
  scalabilityPlanId: string; documentNodeCount: number; sourceFileCount: number; totalSourceBytes: number; operationCount: number; generatedFileCount: number; identityCount: number; dependencyCount: number; tokenCount: number; apiEndpointCount: number; repairAttemptCount: number;
  chunkPlan: UIScalabilityChunkPlan; indexPlan: UIScalabilityIndexPlan; paginationPlan: UIScalabilityPaginationPlan; thresholds: UIScalabilityPerformanceThreshold; metrics: UIScalabilityPerformanceMetric[]; issues: UIScalabilityPerformanceIssue[]; riskLevel: UIScalabilityPerformanceRisk; requiresManualReview: boolean; blockedReasons: string[];
  caveat: "Scalability/performance planning is deterministic dry-run analysis and does not execute benchmarks, write files, deploy, or prove runtime performance.";
};

export const UI_SCALABILITY_PERFORMANCE_CAVEAT = "Scalability/performance planning is deterministic dry-run analysis and does not execute benchmarks, write files, deploy, or prove runtime performance." as const;
export const DEFAULT_UI_SCALABILITY_THRESHOLDS: UIScalabilityPerformanceThreshold = { documentNodes: { warning: 500, high: 2000 }, sourceFiles: { warning: 100, high: 500 }, totalSourceBytes: { warning: 1024 * 1024, high: 5 * 1024 * 1024 }, operations: { warning: 100, high: 500, safeLimit: 10000 }, generatedFiles: { warning: 250, high: 1000 } };
