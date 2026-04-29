import fs from "fs";
import path from "path";
import { type RepoValidatorResult } from "../repoValidators";

export function validateLiveUIBuilderSourceIdentityReadiness(root: string): RepoValidatorResult {
  const checks = ["packages/ui-preview-engine/src/uiSourceIdentityModel.ts","packages/ui-preview-engine/src/uiSourceIdentityTracker.ts","packages/ui-preview-engine/src/uiSourcePatch.ts","packages/ui-preview-engine/src/uiSourceRoundTrip.ts","apps/control-plane/src/components/live-ui-builder/LiveUIBuilderSourceSyncPanel.tsx","packages/ui-preview-engine/src/tests/uiSourceIdentityModel.test.ts","packages/ui-preview-engine/src/tests/uiSourceIdentityTracker.test.ts","package.json"];
  const read=(r:string)=>fs.existsSync(path.join(root,r))?fs.readFileSync(path.join(root,r),"utf8"):"";
  const all = checks.map(read).join("\n");
  const pkg = read("package.json");
  const ok = checks.every((c)=>fs.existsSync(path.join(root,c)))
    && read("packages/ui-preview-engine/src/uiSourceIdentityTracker.ts").includes("typescript")
    && read("packages/ui-preview-engine/src/uiSourcePatch.ts").includes("sourceIdentityId")
    && read("packages/ui-preview-engine/src/uiSourceRoundTrip.ts").includes("staleIdentity")
    && read("apps/control-plane/src/components/live-ui-builder/LiveUIBuilderSourceSyncPanel.tsx").includes("Parser-backed source identity is best-effort")
    && pkg.includes("test:ui-source-identity-model")
    && pkg.includes("test:ui-source-identity-tracker")
    && pkg.includes("test:universal")
    && !all.toLowerCase().includes("deploy app");
  return { name: "Validate-Botomatic-LiveUIBuilderSourceIdentityReadiness", status: ok ? "passed" : "failed", summary: ok ? "Live UI source identity readiness is parser-backed and guardrailed." : "Live UI source identity readiness is incomplete.", checks };
}
