export type UIGeneratedAppRuntimeSmokeTarget = "next-app" | "vite-react" | "static-html" | "unknown"

export type UIGeneratedAppRuntimeSmokeRiskLevel = "low" | "medium" | "high"

export type UIGeneratedAppRuntimeSmokeStep = {
  key: string
  description: string
  command?: string
  planned: boolean
  executed: boolean
  status: "pending" | "completed" | "failed" | "skipped"
}

export type UIGeneratedAppRuntimeSmokeIssue = {
  code: string
  message: string
  severity: "info" | "warning" | "error"
}

export type UIGeneratedAppRuntimeSmokeInput = {
  projectPath?: string
  target: UIGeneratedAppRuntimeSmokeTarget
  packageManager?: "npm" | "pnpm" | "yarn" | "unknown"
  startCommand?: string
}

export type UIGeneratedAppRuntimeSmokeResult = {
  smokeRunId: string
  target: UIGeneratedAppRuntimeSmokeTarget
  projectPath: string
  steps: UIGeneratedAppRuntimeSmokeStep[]
  started: boolean
  reachable: boolean
  httpStatus: number | null
  checkedUrls: string[]
  issues: UIGeneratedAppRuntimeSmokeIssue[]
  blockedReasons: string[]
  riskLevel: UIGeneratedAppRuntimeSmokeRiskLevel
  requiresManualReview: boolean
  runtimeProofAvailable: boolean
  executionMode: "planned-only" | "local-dev-executed" | "local-dev-skipped"
  caveat: string
}

export const UI_GENERATED_APP_RUNTIME_SMOKE_CAVEAT = "Generated app runtime smoke is local/dev-only proof. It may install dependencies and start local dev servers, but it does not deploy, publish, upload, call provider/platform APIs, or prove production correctness."
