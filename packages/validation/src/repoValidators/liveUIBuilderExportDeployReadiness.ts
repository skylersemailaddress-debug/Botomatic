import fs from "fs";
import path from "path";
import { type RepoValidatorResult } from "../repoValidators";

export function validateLiveUIBuilderExportDeployReadiness(root: string): RepoValidatorResult {
  const files = [
    "packages/ui-preview-engine/src/uiExportDeployModel.ts",
    "packages/ui-preview-engine/src/uiExportBundlePlanner.ts",
    "packages/ui-preview-engine/src/uiDeployTargetPlanner.ts",
    "packages/ui-preview-engine/src/uiExportDeployPlanner.ts",
    "packages/ui-preview-engine/src/tests/uiExportBundlePlanner.test.ts",
    "packages/ui-preview-engine/src/tests/uiDeployTargetPlanner.test.ts",
    "packages/ui-preview-engine/src/tests/uiExportDeployPlanner.test.ts",
    "apps/control-plane/src/components/live-ui-builder/LiveUIBuilderSourceSyncPanel.tsx",
    "packages/validation/src/tests/liveUIBuilderSourceSyncPanel.test.ts",
    "package.json",
  ];
  const okFiles = files.every((f) => fs.existsSync(path.join(root, f)));
  const read = (f: string) => fs.readFileSync(path.join(root, f), "utf8");
  const plannerText = okFiles ? read("packages/ui-preview-engine/src/uiExportBundlePlanner.ts") + read("packages/ui-preview-engine/src/uiDeployTargetPlanner.ts") + read("packages/ui-preview-engine/src/uiExportDeployPlanner.ts") : "";
  const testText = okFiles ? read("packages/ui-preview-engine/src/tests/uiExportBundlePlanner.test.ts") + read("packages/ui-preview-engine/src/tests/uiDeployTargetPlanner.test.ts") + read("packages/ui-preview-engine/src/tests/uiExportDeployPlanner.test.ts") : "";
  const panel = okFiles ? read("apps/control-plane/src/components/live-ui-builder/LiveUIBuilderSourceSyncPanel.tsx") : "";
  const pjson = okFiles ? read("package.json") : "";

  const requiredSignals = [
    "release-evidence/runtime/", "empty-path", "dist/app.js", "malformed-input", "bundleManifestId",
    "scalability not high-risk", "reliability repair not manual-review", "UX apply state safe",
    "missing required env reference", "API route on static-host rejected", "framework/provider incompatible",
    "unknown provider", "rollback required but missing", "raw secret literal rejected", "bundle contains unsafe files",
    "liveDeployBlocked", "exportDeployPlanId", "allowLiveDeploy=true blocked",
  ];
  const banned = ["fs", "child_process", "exec", "spawn", "execa", "fetch", "axios", "XMLHttpRequest", "zip", "archiver", "https://", "writeFile"];
  const bannedOk = banned.every((token) => !plannerText.includes(token));

  const ok = okFiles
    && requiredSignals.every((s) => plannerText.includes(s) || testText.includes(s))
    && panel.includes("Export/deploy planning is dry-run only and does not build, package, upload, deploy, write files, create URLs, or prove runtime correctness.")
    && pjson.includes("test:ui-export-deploy-model")
    && pjson.includes("test:ui-export-bundle-planner")
    && pjson.includes("test:ui-deploy-target-planner")
    && pjson.includes("test:ui-export-deploy-planner")
    && pjson.includes("test:universal")
    && bannedOk;

  return { name: "Validate-Botomatic-LiveUIBuilderExportDeployReadiness", status: ok ? "passed" : "failed", summary: ok ? "Live UI Builder export/deploy readiness checks passed." : "Live UI Builder export/deploy readiness missing or shallow.", checks: files };
}
