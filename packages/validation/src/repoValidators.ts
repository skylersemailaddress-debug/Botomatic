import fs from "fs";
import path from "path";

export type RepoValidatorResult = {
  name: string;
  status: "passed" | "failed";
  summary: string;
  checks: string[];
};

function read(root: string, rel: string): string {
  return fs.readFileSync(path.join(root, rel), "utf8");
}

function has(root: string, rel: string): boolean {
  return fs.existsSync(path.join(root, rel));
}

function result(name: string, ok: boolean, summary: string, checks: string[]): RepoValidatorResult {
  return { name, status: ok ? "passed" : "failed", summary, checks };
}

export function validateArchitecture(root: string): RepoValidatorResult {
  const checks = [
    "apps/orchestrator-api/src/bootstrap.ts",
    "apps/orchestrator-api/src/server_app.ts",
    "apps/orchestrator-api/src/config.ts",
  ];
  const ok = checks.every((p) => has(root, p));
  return result("Validate-Botomatic-Architecture", ok, ok ? "API entrypoint, app builder, and runtime config exist." : "Missing one or more core backend entrypoint files.", checks);
}

export function validateBuilderCapability(root: string): RepoValidatorResult {
  const checks = [
    "packages/master-truth/src/compiler.ts",
    "packages/packet-engine/src/generator.ts",
    "packages/execution/src/runner.ts",
    "packages/executor-adapters/src/mockExecutor.ts",
  ];
  const ok = checks.every((p) => has(root, p));
  return result("Validate-Botomatic-BuilderCapability", ok, ok ? "Compile, plan, execution, and adapter files exist." : "Builder pipeline files are incomplete.", checks);
}

export function validateUIReadiness(root: string): RepoValidatorResult {
  const checks = [
    "apps/control-plane/src/components/chat/ConversationPane.tsx",
    "apps/control-plane/src/components/overview/OverviewPanel.tsx",
    "apps/control-plane/src/components/overview/GatePanel.tsx",
    "apps/control-plane/src/components/overview/DeploymentPanel.tsx",
    "apps/control-plane/src/components/overview/PacketPanel.tsx",
    "apps/control-plane/src/components/overview/ArtifactPanel.tsx",
  ];
  const ok = checks.every((p) => has(root, p));
  return result("Validate-Botomatic-UIReadiness", ok, ok ? "Core operator control-plane surfaces exist." : "One or more required control-plane UI surfaces are missing.", checks);
}

export function validateSecurity(root: string): RepoValidatorResult {
  const checks = [
    "apps/orchestrator-api/src/auth/oidc.ts",
    "apps/orchestrator-api/src/auth/roles.ts",
    "apps/orchestrator-api/src/config.ts",
    "apps/orchestrator-api/src/server_app.ts",
  ];
  const fileOk = checks.every((p) => has(root, p));
  const server = fileOk ? read(root, "apps/orchestrator-api/src/server_app.ts") : "";
  const ok = fileOk && server.includes("requireRole(\"admin\"") && server.includes("verifyOidcBearerToken") && server.includes("requireApiAuth(config)");
  return result("Validate-Botomatic-Security", ok, ok ? "OIDC verification and role-enforced routes are wired." : "OIDC or route-level auth enforcement is incomplete.", checks);
}

export function validateGovernance(root: string): RepoValidatorResult {
  const checks = [
    "apps/control-plane/src/components/overview/GatePanel.tsx",
    "apps/control-plane/src/components/overview/DeploymentPanel.tsx",
    "apps/orchestrator-api/src/server_app.ts",
  ];
  const fileOk = checks.every((p) => has(root, p));
  const server = fileOk ? read(root, "apps/orchestrator-api/src/server_app.ts") : "";
  const ok = fileOk && server.includes("/ui/gate") && server.includes("/deploy/promote") && server.includes("Cannot promote: gate not ready");
  return result("Validate-Botomatic-Governance", ok, ok ? "Gate-aware promotion and governance routes are present." : "Governance/gate wiring is incomplete.", checks);
}

export function validateReliability(root: string): RepoValidatorResult {
  const checks = [
    "packages/supabase-adapter/src/jobClient.ts",
    "apps/orchestrator-api/src/server_app.ts",
  ];
  const fileOk = checks.every((p) => has(root, p));
  const server = fileOk ? read(root, "apps/orchestrator-api/src/server_app.ts") : "";
  const ok = fileOk && server.includes("claimJob") && server.includes("finalizeJob") && server.includes("repair/replay") && server.includes("workerTick");
  return result("Validate-Botomatic-Reliability", ok, ok ? "Queue worker, finalize path, and replay controls exist." : "Queue/replay reliability wiring is incomplete.", checks);
}

export function validateObservability(root: string): RepoValidatorResult {
  const checks = [
    "apps/orchestrator-api/src/audit/types.ts",
    "apps/orchestrator-api/src/server_app.ts",
  ];
  const fileOk = checks.every((p) => has(root, p));
  const server = fileOk ? read(root, "apps/orchestrator-api/src/server_app.ts") : "";
  const ok = fileOk && server.includes("/ui/audit") && server.includes("emitEvent(") && server.includes("route_error");
  return result("Validate-Botomatic-Observability", ok, ok ? "Audit API, audit emission, and structured route error logging exist." : "Observability/audit wiring is incomplete.", checks);
}

export function validateLaunchReadiness(root: string): RepoValidatorResult {
  const checks = [
    "VALIDATION_MATRIX.md",
    "LAUNCH_BLOCKERS.md",
    "apps/orchestrator-api/src/server_app.ts",
  ];
  const fileOk = checks.every((p) => has(root, p));
  const server = fileOk ? read(root, "apps/orchestrator-api/src/server_app.ts") : "";
  const ok = fileOk && server.includes("buildGate(") && server.includes("launchStatus") && server.includes("Cannot promote: gate not ready");
  return result("Validate-Botomatic-LaunchReadiness", ok, ok ? "Gate logic and launch-blocking promotion checks are present." : "Launch-readiness gate wiring is incomplete.", checks);
}

export function validateDocumentation(root: string): RepoValidatorResult {
  const checks = [
    "PRODUCT_SCOPE.md",
    "LAUNCH_BLOCKERS.md",
    "VALIDATION_MATRIX.md",
    "READINESS_SCORECARD.json",
  ];
  const ok = checks.every((p) => has(root, p));
  return result("Validate-Botomatic-Documentation", ok, ok ? "Core scope, blockers, validation matrix, and scorecard docs exist." : "Required launch documentation files are missing.", checks);
}

export function runAllRepoValidators(root: string): RepoValidatorResult[] {
  return [
    validateArchitecture(root),
    validateBuilderCapability(root),
    validateUIReadiness(root),
    validateSecurity(root),
    validateGovernance(root),
    validateReliability(root),
    validateObservability(root),
    validateLaunchReadiness(root),
    validateDocumentation(root),
  ];
}
