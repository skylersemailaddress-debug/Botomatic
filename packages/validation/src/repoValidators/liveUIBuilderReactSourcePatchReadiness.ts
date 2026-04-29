import fs from "fs";
import path from "path";
import { type RepoValidatorResult } from "../repoValidators";

export function validateLiveUIBuilderReactSourcePatchReadiness(root: string): RepoValidatorResult {
  const checks = ["packages/ui-preview-engine/src/uiReactSourceAnalyzer.ts","packages/ui-preview-engine/src/uiReactSourcePatch.ts","packages/ui-preview-engine/src/uiRouteTemplate.ts","packages/ui-preview-engine/src/tests/uiReactSourceAnalyzer.test.ts","packages/ui-preview-engine/src/tests/uiReactSourcePatch.test.ts","packages/ui-preview-engine/src/tests/uiRouteTemplate.test.ts","package.json","packages/ui-preview-engine/src/uiSourceApply.ts","packages/ui-preview-engine/src/uiSourcePatch.ts","packages/validation/src/repoValidators.ts"];
  const has=(r:string)=>fs.existsSync(path.join(root,r)); const read=(r:string)=>has(r)?fs.readFileSync(path.join(root,r),"utf8"):"";
  const pkg=read("package.json"); const apply=read("packages/ui-preview-engine/src/uiSourceApply.ts"); const patch=read("packages/ui-preview-engine/src/uiSourcePatch.ts");
  const ok = checks.every(has) && pkg.includes("test:ui-react-source-analyzer") && pkg.includes("test:ui-react-source-patch") && pkg.includes("test:ui-route-template") && pkg.includes("test:universal") && apply.includes("low-confidence") && apply.includes("beforeSnippet") && patch.includes("requiresManualReview") && ![read("packages/ui-preview-engine/src/uiReactSourceAnalyzer.ts"),read("packages/ui-preview-engine/src/uiReactSourcePatch.ts"),read("packages/ui-preview-engine/src/uiRouteTemplate.ts")].join("\n").toLowerCase().includes("deploy") && ![read("packages/ui-preview-engine/src/uiReactSourceAnalyzer.ts"),read("packages/ui-preview-engine/src/uiReactSourcePatch.ts"),read("packages/ui-preview-engine/src/uiRouteTemplate.ts")].join("\n").toLowerCase().includes("export");
  return { name: "Validate-Botomatic-LiveUIBuilderReactSourcePatchReadiness", status: ok ? "passed" : "failed", summary: ok ? "React source patch readiness is wired with quality guards." : "React source patch readiness is incomplete.", checks };
}
