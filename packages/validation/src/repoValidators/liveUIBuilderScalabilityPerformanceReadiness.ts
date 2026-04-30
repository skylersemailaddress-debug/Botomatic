import fs from "fs";
import path from "path";
import { type RepoValidatorResult } from "../repoValidators";

export function validateLiveUIBuilderScalabilityPerformanceReadiness(root: string): RepoValidatorResult {
  const requiredFiles = [
    "packages/ui-preview-engine/src/uiScalabilityPerformanceModel.ts",
    "packages/ui-preview-engine/src/uiScalabilityPerformanceAnalyzer.ts",
    "packages/ui-preview-engine/src/uiScalabilityChunkPlanner.ts",
    "packages/ui-preview-engine/src/tests/uiScalabilityPerformanceModel.test.ts",
    "packages/ui-preview-engine/src/tests/uiScalabilityPerformanceAnalyzer.test.ts",
    "packages/ui-preview-engine/src/tests/uiScalabilityChunkPlanner.test.ts"
  ];

  const contentChecks = [
    "createHash",
    "scalabilityPlanId",
    "release-evidence/runtime",
    "riskLevel",
    "requiresManualReview",
    "deterministic dry-run planning"
  ];

  const forbidden = [
    "child_process",
    "exec",
    "spawn",
    "fetch",
    "axios",
    "writeFile",
    "deploy",
    "upload"
  ];

  let ok = true;
  const issues: string[] = [];

  for (const file of requiredFiles) {
    const full = path.join(root, file);
    if (!fs.existsSync(full)) {
      ok = false;
      issues.push(`missing file: ${file}`);
      continue;
    }
    const content = fs.readFileSync(full, "utf-8");
    for (const check of contentChecks) {
      if (!content.includes(check)) {
        ok = false;
        issues.push(`missing signal ${check} in ${file}`);
      }
    }
    for (const bad of forbidden) {
      if (content.includes(bad)) {
        ok = false;
        issues.push(`forbidden reference ${bad} in ${file}`);
      }
    }
  }

  return {
    name: "Validate-Botomatic-LiveUIBuilderScalabilityPerformanceReadiness",
    status: ok ? "passed" : "failed",
    summary: ok ? "Scalability/performance readiness checks passed." : "Scalability/performance readiness missing or shallow.",
    checks: issues
  };
}
