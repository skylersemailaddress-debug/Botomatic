import crypto from "crypto";
import { createUIScalabilityChunkPlan, createUIScalabilityIndexPlan, createUIScalabilityPaginationPlan } from "./uiScalabilityChunkPlanner";
import { DEFAULT_UI_SCALABILITY_THRESHOLDS, UI_SCALABILITY_PERFORMANCE_CAVEAT, type UIScalabilityPerformanceInput, type UIScalabilityPerformanceIssue, type UIScalabilityPerformancePlan } from "./uiScalabilityPerformanceModel";

const countNodes = (n: any): number => !n || typeof n !== "object" ? 0 : 1 + ((Array.isArray(n.children) ? n.children : []).reduce((a, c) => a + countNodes(c), 0));

export function analyzeUIScalabilityPerformance(input: UIScalabilityPerformanceInput): UIScalabilityPerformancePlan {
  const issues: UIScalabilityPerformanceIssue[] = [];
  if (input && typeof input !== "object") issues.push({ code: "unknown-shape", message: "unknown/unsupported input shape", severity: "high" });
  const documentNodeCount = countNodes((input as any)?.editableDocument);
  const sourceFiles = (input as any)?.sourceFiles && typeof (input as any).sourceFiles === "object" ? (input as any).sourceFiles as Record<string, string> : {};
  const sourceFileCount = Object.keys(sourceFiles).length;
  const totalSourceBytes = Object.values(sourceFiles).reduce((a, c) => a + Buffer.byteLength(typeof c === "string" ? c : "", "utf8"), 0);
  const sourcePatchOps = ((input as any)?.sourcePatchPlan?.operations ?? []).length;
  const multiFileOps = ((input as any)?.multiFilePlan?.operations ?? (input as any)?.multiFilePlan?.plan?.operations ?? []).length;
  const wiringOps = ((input as any)?.dataStateApiWiringPlan?.operations ?? []).length;
  const repairOps = ((input as any)?.reliabilityRepairPlan?.selectedStrategies ?? []).length;
  const operationCount = sourcePatchOps + multiFileOps + wiringOps + repairOps;
  const generatedFileCount = ((input as any)?.fullProjectGenerationPlan?.files ?? (input as any)?.fullProjectGenerationPlan?.plan?.files ?? []).length;
  const identityCount = ((input as any)?.sourceIdentityResult?.identities ?? []).length;
  const dependencyCount = ((input as any)?.multiFilePlan?.dependencies ?? (input as any)?.multiFilePlan?.plan?.dependencies ?? []).length;
  const tokenCount = ((input as any)?.stylePlan?.tokens ?? []).length;
  const apiEndpointCount = ((input as any)?.dataStateApiWiringPlan?.apiEndpoints ?? []).length;
  const repairAttemptCount = Number((input as any)?.reliabilityRepairPlan?.attemptCount ?? 0);
  const thresholds = DEFAULT_UI_SCALABILITY_THRESHOLDS;
  const impliedSourceAnalysis = sourcePatchOps > 0 || multiFileOps > 0 || generatedFileCount > 0;
  if (impliedSourceAnalysis && sourceFileCount === 0) issues.push({ code: "missing-source-files", message: "sourceFiles missing while source analysis is implied", severity: "high" });
  if (operationCount > thresholds.operations.safeLimit) issues.push({ code: "safe-limit-exceeded", message: "operation count exceeds safe limit", severity: "high" });
  if (generatedFileCount > 0 && sourceFileCount > 0 && generatedFileCount < sourceFileCount / 1000) issues.push({ code: "inconsistent-counts", message: "inconsistent counts detected", severity: "medium" });
  const metrics = [
    { name: "documentNodes", warning: thresholds.documentNodes.warning, high: thresholds.documentNodes.high, value: documentNodeCount },
    { name: "sourceFiles", warning: thresholds.sourceFiles.warning, high: thresholds.sourceFiles.high, value: sourceFileCount },
    { name: "totalSourceBytes", warning: thresholds.totalSourceBytes.warning, high: thresholds.totalSourceBytes.high, value: totalSourceBytes },
    { name: "operations", warning: thresholds.operations.warning, high: thresholds.operations.high, value: operationCount },
    { name: "generatedFiles", warning: thresholds.generatedFiles.warning, high: thresholds.generatedFiles.high, value: generatedFileCount }
  ];
  const exceedsHigh = metrics.some((m) => m.value >= m.high);
  const exceedsWarning = metrics.some((m) => m.value >= m.warning);
  const riskLevel = exceedsHigh ? "high" : exceedsWarning ? "medium" : "low";
  const requiresManualReview = riskLevel === "high" || issues.some((i) => i.severity === "high");
  const blockedReasons = issues.filter((i) => i.severity !== "low").map((i) => i.message);
  const normalized = JSON.stringify({ documentNodeCount, sourceFileCount, totalSourceBytes, operationCount, generatedFileCount, identityCount, dependencyCount, tokenCount, apiEndpointCount, repairAttemptCount, riskLevel, blockedReasons: [...blockedReasons].sort() });
  const scalabilityPlanId = `ui-scalability-${crypto.createHash("sha256").update(normalized).digest("hex").slice(0, 16)}`;
  const chunkPlan = createUIScalabilityChunkPlan({ documentNodeCount, sourceFiles, operationCount });
  const indexPlan = createUIScalabilityIndexPlan({ documentNodeCount, sourceFileCount, identityCount, dependencyCount });
  const paginationPlan = createUIScalabilityPaginationPlan({ changedFilesCount: sourceFileCount, operationCount, identityCount, dependencyCount, repairAttemptCount });
  return { scalabilityPlanId, documentNodeCount, sourceFileCount, totalSourceBytes, operationCount, generatedFileCount, identityCount, dependencyCount, tokenCount, apiEndpointCount, repairAttemptCount, chunkPlan, indexPlan, paginationPlan, thresholds, metrics, issues, riskLevel, requiresManualReview, blockedReasons, caveat: UI_SCALABILITY_PERFORMANCE_CAVEAT };
}
