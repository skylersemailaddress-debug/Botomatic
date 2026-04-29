import fs from "fs";
import path from "path";
import { type RepoValidatorResult } from "../repoValidators";

export function validateLiveUIBuilderLocalFileAdapterReadiness(root: string): RepoValidatorResult {
  const checks = ["packages/ui-preview-engine/src/uiLocalFileAdapter.ts","packages/ui-preview-engine/src/tests/uiLocalFileAdapter.test.ts","packages/ui-preview-engine/src/uiSourceApply.ts","apps/control-plane/src/components/vibe/useLiveUIBuilderVibe.ts","package.json","packages/validation/src/repoValidators.ts"];
  const has=(rel:string)=>fs.existsSync(path.join(root,rel));
  const read=(rel:string)=>fs.readFileSync(path.join(root,rel),"utf8");
  const adapter=has(checks[0])?read(checks[0]):"";
  const apply=has(checks[2])?read(checks[2]):"";
  const hook=has(checks[3])?read(checks[3]):"";
  const pkg=has("package.json")?read("package.json"):"";
  const validators=has("packages/validation/src/repoValidators.ts")?read("packages/validation/src/repoValidators.ts"):"";
  const ok = checks.every(has)
    && pkg.includes('"test:ui-local-file-adapter"')
    && pkg.includes('test:ui-local-file-adapter')
    && pkg.includes('"test:universal"')
    && validators.includes("validateLiveUIBuilderLocalFileAdapterReadiness")
    && adapter.includes("release-evidence/runtime")
    && adapter.toLowerCase().includes(".env")
    && adapter.toLowerCase().includes("secret")
    && adapter.includes("node_modules") && adapter.includes(".git") && adapter.includes("dist") && adapter.includes("build")
    && adapter.includes("allowWrites")
    && apply.includes("confirmationMarker")
    && !hook.toLowerCase().includes("deploy")
    && !hook.toLowerCase().includes("export readiness")
    && !hook.toLowerCase().includes("runtime correctness claim");
  return { name: "Validate-Botomatic-LiveUIBuilderLocalFileAdapterReadiness", status: ok ? "passed" : "failed", summary: ok ? "Local file adapter contract, safety gates, scripts, and validator wiring are present." : "Local file adapter readiness is incomplete.", checks };
}
