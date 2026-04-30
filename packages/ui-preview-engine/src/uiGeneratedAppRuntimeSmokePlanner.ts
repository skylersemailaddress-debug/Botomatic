import crypto from "crypto"
import { UI_GENERATED_APP_RUNTIME_SMOKE_CAVEAT, type UIGeneratedAppRuntimeSmokeInput, type UIGeneratedAppRuntimeSmokeIssue, type UIGeneratedAppRuntimeSmokeResult, type UIGeneratedAppRuntimeSmokeStep } from "./uiGeneratedAppRuntimeSmokeModel"

const step = (key: string, description: string, command?: string): UIGeneratedAppRuntimeSmokeStep => ({ key, description, command, planned: true, executed: false, status: "pending" })
const defaultSteps = (install?: string, start?: string): UIGeneratedAppRuntimeSmokeStep[] => [
  step("validate-project-path", "validate project path"),
  step("detect-package-manager", "detect package manager"),
  step("install-dependencies", "install dependencies", install),
  step("start-local-server", "start local server", start),
  step("wait-readiness", "wait for readiness"),
  step("http-check", "HTTP check"),
  step("collect-result", "collect result"),
  step("shutdown-server", "shutdown server")
]

export function createUIGeneratedAppRuntimeSmokePlan(input: UIGeneratedAppRuntimeSmokeInput): UIGeneratedAppRuntimeSmokeResult {
  const projectPath = input.projectPath?.trim() ?? ""
  const smokeRunId = crypto.createHash("sha256").update(`${input.target}|${projectPath}|${input.packageManager ?? ""}|${input.startCommand ?? ""}`).digest("hex").slice(0, 16)
  const issues: UIGeneratedAppRuntimeSmokeIssue[] = []
  const blockedReasons: string[] = []
  const npmBased = input.target === "next-app" || input.target === "vite-react"

  if (!projectPath) blockedReasons.push("missing projectPath")
  if (projectPath.includes("..")) blockedReasons.push("unsafe projectPath traversal")
  if (input.target === "unknown") blockedReasons.push("unknown target")
  if (npmBased && !input.startCommand) blockedReasons.push("missing start command")
  if (npmBased && !projectPath.endsWith("package.json")) blockedReasons.push("missing package manifest for npm-based target")
  if (input.packageManager && input.packageManager !== "npm") blockedReasons.push("unsupported package manager")

  if (blockedReasons.length > 0) issues.push({ code: "plan_blocked", message: blockedReasons.join("; "), severity: "error" })
  const dedupSortedBlocked = [...new Set(blockedReasons)].sort()
  const dedupSortedIssues = issues.sort((a, b) => `${a.code}:${a.message}`.localeCompare(`${b.code}:${b.message}`))

  return {
    smokeRunId,
    target: input.target,
    projectPath,
    steps: defaultSteps(undefined, input.startCommand),
    started: false,
    reachable: false,
    httpStatus: null,
    checkedUrls: [],
    issues: dedupSortedIssues,
    blockedReasons: dedupSortedBlocked,
    riskLevel: dedupSortedBlocked.length > 0 ? "high" : "low",
    requiresManualReview: dedupSortedBlocked.length > 0,
    runtimeProofAvailable: false,
    executionMode: "planned-only",
    caveat: UI_GENERATED_APP_RUNTIME_SMOKE_CAVEAT
  }
}
