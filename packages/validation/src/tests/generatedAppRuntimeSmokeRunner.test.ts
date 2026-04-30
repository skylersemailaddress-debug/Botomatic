import assert from "assert"
import path from "path"
import { runGeneratedAppRuntimeSmoke } from "../runtime/generatedAppRuntimeSmokeRunner"
import { UI_GENERATED_APP_RUNTIME_SMOKE_CAVEAT } from "../../../ui-preview-engine/src/uiGeneratedAppRuntimeSmokeModel"

async function main() {
  const root = path.resolve("packages/validation/src/runtime/fixtures/generated-apps")
  const staticResult = await runGeneratedAppRuntimeSmoke({ rootPath: root, projectPath: path.join(root, "static-html-basic"), target: "static-html", port: 4181 })
  assert(staticResult.reachable)
  const viteResult = await runGeneratedAppRuntimeSmoke({ rootPath: root, projectPath: path.join(root, "vite-react-basic"), target: "vite-react", port: 4182 })
  assert(viteResult.reachable)
  const nextResult = await runGeneratedAppRuntimeSmoke({ rootPath: root, projectPath: path.join(root, "next-app-basic"), target: "next-app", port: 4183 })
  assert(nextResult.runtimeProofAvailable === false)
  assert(nextResult.blockedReasons.length > 0)
  const missingPath = await runGeneratedAppRuntimeSmoke({ rootPath: root, projectPath: "", target: "static-html" })
  assert(missingPath.blockedReasons.includes("missing projectPath"))
  const traversal = await runGeneratedAppRuntimeSmoke({ rootPath: root, projectPath: "../outside", target: "static-html" })
  assert(traversal.blockedReasons.some((r) => r.includes("traversal")))
  assert(staticResult.smokeRunId && staticResult.checkedUrls.length === 2 && staticResult.caveat === UI_GENERATED_APP_RUNTIME_SMOKE_CAVEAT)
  console.log("generatedAppRuntimeSmokeRunner.test.ts passed")
}

void main()
