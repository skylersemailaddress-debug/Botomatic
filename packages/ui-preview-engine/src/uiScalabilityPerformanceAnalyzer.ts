import crypto from "crypto";
import { UI_SCALABILITY_PERFORMANCE_CAVEAT, type UIScalabilityPerformanceModelInput, type UIScalabilityPerformanceResult } from "./uiScalabilityPerformanceModel";
import { planUIScalabilityChunks } from "./uiScalabilityChunkPlanner";

export function analyzeUIScalabilityPerformance(input: UIScalabilityPerformanceModelInput): UIScalabilityPerformanceResult {
  const blockedReasons: string[] = [];
  const changedFileCount = input.changedFiles.length;
  if (input.changedFiles.some((f) => /^release-evidence\/runtime\//.test(f))) blockedReasons.push("protected runtime path affected");
  if (input.operationCount <= 0) blockedReasons.push("operationCount must be positive");
  const chunkPlan = planUIScalabilityChunks({ orderedFiles: input.orderedFiles ?? input.changedFiles, operationCount: input.operationCount });
  let riskLevel: "low" | "medium" | "high" = "low";
  if (input.operationCount > 50 || changedFileCount > 20 || input.dependencyCount > 30) riskLevel = "high";
  else if (input.operationCount > 15 || changedFileCount > 8 || input.dependencyCount > 12) riskLevel = "medium";
  const requiresManualReview = blockedReasons.length > 0 || input.manualReviewCount > 0 || riskLevel === "high";
  const scalabilityPlanId = crypto.createHash("sha256").update(JSON.stringify({ input, chunkCount: chunkPlan.chunkCount, riskLevel })).digest("hex").slice(0, 16);
  const summary = { scalabilityPlanId, changedFileCount, operationCount: input.operationCount, manualReviewCount: input.manualReviewCount, dependencyCount: input.dependencyCount, chunkCount: chunkPlan.chunkCount, averageChunkSize: chunkPlan.averageChunkSize, maxChunkSize: chunkPlan.maxChunkSize, riskLevel, requiresManualReview, blockedReasons: [...new Set(blockedReasons)].sort(), caveat: UI_SCALABILITY_PERFORMANCE_CAVEAT };
  return { ok: blockedReasons.length === 0, summary, issues: blockedReasons.map((message) => ({ code: "blocked", message, blocked: true })) };
}
