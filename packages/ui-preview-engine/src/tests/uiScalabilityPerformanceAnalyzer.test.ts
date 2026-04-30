import assert from "assert";
import { analyzeUIScalabilityPerformance } from "../uiScalabilityPerformanceAnalyzer";
const a = analyzeUIScalabilityPerformance({ changedFiles: ["src/a.ts"], operationCount: 2, manualReviewCount: 0, dependencyCount: 1 });
const b = analyzeUIScalabilityPerformance({ changedFiles: ["src/a.ts"], operationCount: 2, manualReviewCount: 0, dependencyCount: 1 });
assert.equal(a.summary.scalabilityPlanId, b.summary.scalabilityPlanId);
assert.equal(a.summary.riskLevel, "low");
assert(analyzeUIScalabilityPerformance({ changedFiles: ["release-evidence/runtime/x"], operationCount: 1, manualReviewCount: 0, dependencyCount: 0 }).summary.requiresManualReview);
console.log("uiScalabilityPerformanceAnalyzer tests passed");
