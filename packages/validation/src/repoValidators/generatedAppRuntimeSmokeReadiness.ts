import fs from "fs"
import path from "path"
import type { RepoValidatorResult } from "../repoValidators"

export function validateGeneratedAppRuntimeSmokeReadiness(root: string): RepoValidatorResult {
 const checks = ["packages/ui-preview-engine/src/uiGeneratedAppRuntimeSmokeModel.ts","packages/ui-preview-engine/src/uiGeneratedAppRuntimeSmokePlanner.ts","packages/validation/src/runtime/generatedAppRuntimeSmokeRunner.ts","packages/validation/src/tests/generatedAppRuntimeSmokeRunner.test.ts","packages/ui-preview-engine/src/tests/uiGeneratedAppRuntimeSmokeModel.test.ts","packages/ui-preview-engine/src/tests/uiGeneratedAppRuntimeSmokePlanner.test.ts","apps/control-plane/src/components/live-ui-builder/LiveUIBuilderSourceSyncPanel.tsx"]
 const hasAll = checks.every((f) => fs.existsSync(path.join(root,f))) && fs.existsSync(path.join(root,"packages/validation/src/runtime/fixtures/generated-apps/static-html-basic/index.html"))
 const planner = hasAll ? fs.readFileSync(path.join(root,checks[1]),"utf8") : ""
 const runner = hasAll ? fs.readFileSync(path.join(root,checks[2]),"utf8") : ""
 const pkg = fs.readFileSync(path.join(root,"package.json"),"utf8")
 const badPlanner = [/child_process/,/\bspawn\s*\(/,/\bexec\s*\(/,/\bfetch\s*\(/,/axios/,/XMLHttpRequest/,/writeFile/,/npm install/,/npm ci/,/npm run/,/pnpm/,/yarn/,/deploy/,/publish/,/upload/,/https:\/\//,/Date\.now/,/performance\.now/].some((r)=>r.test(planner))
 const runnerGuards = ["deploy","publish","upload","provider","platform","app-store","play-store","steam","roblox","xcodebuild","gradle","eas","external URL rejected"].every((x)=>runner.includes(x))
 const ok = hasAll && !badPlanner && runnerGuards && planner.includes("createHash") && runner.includes("child.kill") && pkg.includes("test:ui-generated-app-runtime-smoke-model") && pkg.includes("test:ui-generated-app-runtime-smoke-planner") && pkg.includes("test:generated-app-runtime-smoke-runner") && pkg.includes("test:universal") && pkg.includes("validate:all")
 return { name: "Validate-Botomatic-GeneratedAppRuntimeSmokeReadiness", status: ok?"passed":"failed", summary: ok?"Generated app runtime smoke readiness is wired with local-only safety guards.":"Generated app runtime smoke readiness is incomplete.", checks }
}
