import fs from "fs"
import path from "path"
import crypto from "crypto"
import { spawn } from "child_process"
import { UI_GENERATED_APP_RUNTIME_SMOKE_CAVEAT, type UIGeneratedAppRuntimeSmokeResult, type UIGeneratedAppRuntimeSmokeTarget } from "../../../ui-preview-engine/src/uiGeneratedAppRuntimeSmokeModel"

const BAD_SCRIPT = /(deploy|publish|upload|provider|platform|app-store|play-store|steam|roblox|xcodebuild|gradle|eas)/i
const localUrls = (port: number) => [`http://127.0.0.1:${port}/`, `http://localhost:${port}/`]

export async function runGeneratedAppRuntimeSmoke(input: { rootPath: string; projectPath: string; target: UIGeneratedAppRuntimeSmokeTarget; port?: number; timeoutMs?: number }): Promise<UIGeneratedAppRuntimeSmokeResult> {
 const projectPath = path.resolve(input.projectPath)
 const smokeRunId = crypto.createHash("sha256").update(`${input.target}|${projectPath}`).digest("hex").slice(0, 16)
 const blockedReasons: string[] = []
 const issues: any[] = []
 if (!input.projectPath) blockedReasons.push("missing projectPath")
 if (input.projectPath.includes("..")) blockedReasons.push("unsafe projectPath traversal")
 if (!projectPath.startsWith(path.resolve(input.rootPath))) blockedReasons.push("project path outside provided root")
 const port = input.port ?? 4173
 const checkedUrls = localUrls(port)
 if (blockedReasons.length) return { smokeRunId, target: input.target, projectPath, steps: [], started: false, reachable: false, httpStatus: null, checkedUrls, issues, blockedReasons: [...new Set(blockedReasons)].sort(), riskLevel: "high", requiresManualReview: true, runtimeProofAvailable: false, executionMode: "local-dev-skipped", caveat: UI_GENERATED_APP_RUNTIME_SMOKE_CAVEAT }
 if (input.target === "next-app") {
  return { smokeRunId, target: input.target, projectPath, steps: [], started: false, reachable: false, httpStatus: null, checkedUrls, issues: [{ code: "next_skipped", message: "next fixture skipped in local smoke harness", severity: "info" }], blockedReasons: ["next fixture skipped for deterministic lightweight local runtime smoke"], riskLevel: "low", requiresManualReview: false, runtimeProofAvailable: false, executionMode: "local-dev-skipped", caveat: UI_GENERATED_APP_RUNTIME_SMOKE_CAVEAT }
 }
 const pkgPath = path.join(projectPath, "package.json")
 let startScript = ""
 if (fs.existsSync(pkgPath)) {
  const pkg = JSON.parse(fs.readFileSync(pkgPath, "utf8"))
  const scripts = pkg.scripts ?? {}
  for (const key of ["dev", "start", "preview"]) if (scripts[key]) { startScript = key; break }
  if (Object.values(scripts).some((v: any) => BAD_SCRIPT.test(String(v)))) blockedReasons.push("deploy/publish/upload/provider/platform script rejected")
 }
 for (const url of checkedUrls) { if (!url.startsWith("http://127.0.0.1") && !url.startsWith("http://localhost")) blockedReasons.push("external URL rejected"); if (url.startsWith("https://")) blockedReasons.push("HTTPS URL rejected") }
 if (blockedReasons.length) return { smokeRunId, target: input.target, projectPath, steps: [], started: false, reachable: false, httpStatus: null, checkedUrls, issues, blockedReasons: [...new Set(blockedReasons)].sort(), riskLevel: "high", requiresManualReview: true, runtimeProofAvailable: false, executionMode: "local-dev-skipped", caveat: UI_GENERATED_APP_RUNTIME_SMOKE_CAVEAT }
 let child: any
 try {
  if (fs.existsSync(pkgPath)) await new Promise((resolve, reject) => { const i = spawn("npm", ["install"], { cwd: projectPath, stdio: "ignore" }); i.on("exit", (c) => c === 0 ? resolve(true) : reject(new Error("install failed"))) })
  const cmd = fs.existsSync(pkgPath) && startScript ? ["npm", ["run", startScript, "--", "--port", String(port)]] : ["python3", ["-m", "http.server", String(port), "--directory", projectPath]] as any
  child = spawn(cmd[0], cmd[1], { cwd: projectPath, stdio: "ignore" })
  await new Promise((r) => setTimeout(r, 2000))
  let reachable = false
  let httpStatus: number | null = null
  for (let attempt = 0; attempt < 6 && !reachable; attempt++) {
   for (const url of checkedUrls) {
    const resp = await fetch(url).catch(() => null as any)
    if (resp) { reachable = true; httpStatus = resp.status; break }
   }
   if (!reachable) await new Promise((r) => setTimeout(r, 300))
  }
  return { smokeRunId, target: input.target, projectPath, steps: [], started: true, reachable, httpStatus, checkedUrls, issues, blockedReasons: [], riskLevel: reachable ? "low" : "medium", requiresManualReview: !reachable, runtimeProofAvailable: reachable, executionMode: "local-dev-executed", caveat: UI_GENERATED_APP_RUNTIME_SMOKE_CAVEAT }
 } finally { if (child && !child.killed) child.kill("SIGTERM") }
}
