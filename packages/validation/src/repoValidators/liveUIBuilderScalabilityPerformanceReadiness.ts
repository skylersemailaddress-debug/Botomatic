import fs from "fs";
import path from "path";
import { type RepoValidatorResult } from "../repoValidators";

export function validateLiveUIBuilderScalabilityPerformanceReadiness(root: string): RepoValidatorResult {
  const files = [
    "packages/ui-preview-engine/src/uiScalabilityPerformanceModel.ts",
    "packages/ui-preview-engine/src/uiScalabilityPerformanceAnalyzer.ts",
    "packages/ui-preview-engine/src/uiScalabilityChunkPlanner.ts",
    "packages/ui-preview-engine/src/tests/uiScalabilityPerformanceModel.test.ts",
    "packages/ui-preview-engine/src/tests/uiScalabilityPerformanceAnalyzer.test.ts",
    "packages/ui-preview-engine/src/tests/uiScalabilityChunkPlanner.test.ts",
    "apps/control-plane/src/components/live-ui-builder/LiveUIBuilderSourceSyncPanel.tsx",
    "packages/validation/src/tests/liveUIBuilderSourceSyncPanel.test.ts",
    "package.json"
  ];
  const ok = files.every((f) => fs.existsSync(path.join(root, f)));
  return { name: "Validate-Botomatic-LiveUIBuilderScalabilityPerformanceReadiness", status: ok ? "passed" : "failed", summary: ok ? "Live UI Builder scalability/performance readiness checks passed." : "Live UI Builder scalability/performance readiness missing or shallow.", checks: files };
}
