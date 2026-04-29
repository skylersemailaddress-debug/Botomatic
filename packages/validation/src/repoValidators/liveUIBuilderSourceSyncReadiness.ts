import fs from "fs";
import path from "path";
import { type RepoValidatorResult } from "../repoValidators";

export function validateLiveUIBuilderSourceSyncReadiness(root: string): RepoValidatorResult {
  const checks = [
    "packages/ui-preview-engine/src/uiSourceFileMapping.ts",
    "packages/ui-preview-engine/src/uiSourcePatch.ts",
    "packages/ui-preview-engine/src/uiSourceApply.ts",
    "packages/ui-preview-engine/src/uiSourceRoundTrip.ts",
    "apps/control-plane/src/components/live-ui-builder/LiveUIBuilderSourceSyncPanel.tsx",
    "packages/ui-preview-engine/src/tests/uiSourceFileMapping.test.ts",
    "packages/ui-preview-engine/src/tests/uiSourcePatch.test.ts",
    "packages/ui-preview-engine/src/tests/uiSourceApply.test.ts",
    "packages/ui-preview-engine/src/tests/uiSourceRoundTrip.test.ts",
    "packages/validation/src/tests/liveUIBuilderSourceSyncPanel.test.ts",
    "package.json",
    "packages/validation/src/repoValidators.ts"
  ];
  const has=(rel:string)=>fs.existsSync(path.join(root,rel));
  const read=(rel:string)=>fs.readFileSync(path.join(root,rel),"utf8");
  const filesOk = checks.every(has);
  const pkg = has("package.json") ? read("package.json") : "";
  const apply = has("packages/ui-preview-engine/src/uiSourceApply.ts") ? read("packages/ui-preview-engine/src/uiSourceApply.ts") : "";
  const hook = has("apps/control-plane/src/components/vibe/useLiveUIBuilderVibe.ts") ? read("apps/control-plane/src/components/vibe/useLiveUIBuilderVibe.ts") : "";
  const ok = filesOk && pkg.includes("test:ui-source-file-mapping") && pkg.includes("test:ui-source-patch") && pkg.includes("test:ui-source-apply") && pkg.includes("test:ui-source-round-trip") && pkg.includes("test:live-ui-builder-source-sync-panel") && pkg.includes("test:universal") && apply.includes("dryRun") && apply.includes("confirmationMarker") && apply.includes("release-evidence/runtime") && !hook.toLowerCase().includes("full source-sync completion") && !hook.toLowerCase().includes("full live visual ui builder completion");
  return { name: "Validate-Botomatic-LiveUIBuilderSourceSyncReadiness", status: ok ? "passed" : "failed", summary: ok ? "Guarded source sync modules, tests, scripts, and claim boundaries are wired." : "Live UI Builder source sync readiness is incomplete.", checks };
}
