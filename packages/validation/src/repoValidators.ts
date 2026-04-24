import fs from "fs";
import path from "path";
import { execSync } from "child_process";

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

function isProductionLikeProofGrade(grade: unknown): boolean {
  if (typeof grade !== "string") return false;
  const normalized = grade.trim().toLowerCase();
  return normalized === "production_like" || normalized === "staging_production_like" || normalized === "production";
}

function listTrackedFiles(root: string): string[] {
  try {
    return execSync("git ls-files", { cwd: root, encoding: "utf8" })
      .split("\n")
      .map((line) => line.trim())
      .filter(Boolean);
  } catch {
    return [];
  }
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
    "apps/control-plane/src/services/ops.ts",
  ];
  const fileOk = checks.every((p) => has(root, p));
  const server = fileOk ? read(root, "apps/orchestrator-api/src/server_app.ts") : "";
  const ok =
    fileOk &&
    server.includes("/ui/audit") &&
    server.includes("emitEvent(") &&
    server.includes("route_error") &&
    server.includes("/api/ops/metrics") &&
    server.includes("/api/ops/errors") &&
    server.includes("/api/ops/queue") &&
    server.includes("x-request-id");
  return result(
    "Validate-Botomatic-Observability",
    ok,
    ok ? "Audit API, ops endpoints, and request correlation logging exist." : "Observability wiring is incomplete (audit/ops/correlation).",
    checks
  );
}

export function validateObservabilityRuntimeEvidence(root: string): RepoValidatorResult {
  const checks = [
    "release-evidence/runtime/ops_observability.json",
  ];

  if (!has(root, checks[0])) {
    return result(
      "Validate-Botomatic-ObservabilityRuntimeEvidence",
      false,
      "Observability runtime evidence is missing. Run npm run validate:observability.",
      checks
    );
  }

  let payload: any;
  try {
    payload = JSON.parse(read(root, checks[0]));
  } catch {
    return result(
      "Validate-Botomatic-ObservabilityRuntimeEvidence",
      false,
      "Observability runtime evidence JSON is invalid.",
      checks
    );
  }

  const summary = payload?.summary || {};
  const checkNames = Array.isArray(payload?.suite?.checks)
    ? payload.suite.checks.map((c: any) => c?.name)
    : [];

  const requiredChecks = [
    "ops_metrics_endpoint_live",
    "ops_queue_endpoint_live",
    "ops_errors_endpoint_live",
    "request_id_header_present",
  ];

  const hasAllChecks = requiredChecks.every((name) => checkNames.includes(name));
  const ok = Number(summary.failed || 0) === 0 && hasAllChecks;
  const proofGrade = payload?.proofGrade === "production_like" ? "production-like" : "local";

  return result(
    "Validate-Botomatic-ObservabilityRuntimeEvidence",
    ok,
    ok
      ? `Observability runtime checks passed (${proofGrade} proof).`
      : `Observability runtime checks are incomplete or failing (${proofGrade} proof).`,
    checks
  );
}

export function validateProductionProofProfile(root: string): RepoValidatorResult {
  const checks = [
    "release-evidence/proof_profile.json",
    "release-evidence/manifest.json",
    "FINAL_LAUNCH_READINESS_CRITERIA.md",
  ];

  const fileOk = checks.every((p) => has(root, p));
  if (!fileOk) {
    return result(
      "Validate-Botomatic-ProductionProofProfile",
      false,
      "Production proof profile is missing or incomplete.",
      checks
    );
  }

  let profile: any;
  let manifest: any;
  try {
    profile = JSON.parse(read(root, "release-evidence/proof_profile.json"));
    manifest = JSON.parse(read(root, "release-evidence/manifest.json"));
  } catch {
    return result(
      "Validate-Botomatic-ProductionProofProfile",
      false,
      "Production proof profile or manifest JSON is invalid.",
      checks
    );
  }

  const localMode =
    profile?.proofGrade === "local_runtime" &&
    profile?.enterpriseProductionProof === false &&
    profile?.launchClaimPolicy?.canClaimEnterpriseReady === false &&
    manifest?.launchClaim?.enterpriseReady === false;

  const productionLikeMode =
    isProductionLikeProofGrade(profile?.proofGrade) &&
    profile?.enterpriseProductionProof === true &&
    profile?.launchClaimPolicy?.canClaimEnterpriseReady === true &&
    manifest?.launchClaim?.enterpriseReady === true;

  const gapsAreConsistent =
    localMode
      ? Array.isArray(profile?.productionGaps) && profile.productionGaps.length >= 1
      : Array.isArray(profile?.productionGaps) && profile.productionGaps.length === 0;

  const ok = (localMode || productionLikeMode) && gapsAreConsistent;

  return result(
    "Validate-Botomatic-ProductionProofProfile",
    ok,
    ok
      ? "Production-proof profile is internally consistent with launch claim policy."
      : "Production-proof profile is inconsistent with launch claim state or required proof grade.",
    checks
  );
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

export function validateDeploymentRollbackGate5(root: string): RepoValidatorResult {
  const checks = [
    "apps/orchestrator-api/src/server_app.ts",
    "apps/control-plane/src/components/overview/DeploymentPanel.tsx",
    "apps/control-plane/src/services/deployments.ts",
  ];
  const fileOk = checks.every((p) => has(root, p));
  const server = fileOk ? read(root, "apps/orchestrator-api/src/server_app.ts") : "";
  const ok =
    fileOk &&
    server.includes("/deploy/promote") &&
    server.includes("/deploy/rollback") &&
    server.includes("Cannot promote: gate not ready") &&
    server.includes("Cannot rollback: environment has not been promoted") &&
    server.includes("type: \"promote\"") &&
    server.includes("type: \"rollback\"");
  return result(
    "Validate-Botomatic-DeploymentRollbackGate5",
    ok,
    ok
      ? "Promote and rollback routes are wired with gate checks, persistent deployment state, and audit events."
      : "Gate 5 deployment promote/rollback wiring is incomplete.",
    checks
  );
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

export function validateAuthGovernanceGate4(root: string): RepoValidatorResult {
  const checks = [
    "apps/orchestrator-api/src/server_app.ts",
    "apps/orchestrator-api/src/auth/oidc.ts",
  ];
  const fileOk = checks.every((p) => has(root, p));
  const server = fileOk ? read(root, "apps/orchestrator-api/src/server_app.ts") : "";
  const hasAdminGuard = server.includes("requireRole(\"admin\", config)");
  const hasReviewerGuard = server.includes("requireRole(\"reviewer\", config)");
  const ok =
    fileOk &&
    hasAdminGuard &&
    hasReviewerGuard &&
    server.includes("verifyOidcBearerToken") &&
    server.includes("requireApiAuth(config)") &&
    server.includes("/ui/gate") &&
    server.includes("/deploy/promote");
  return result(
    "Validate-Botomatic-AuthGovernanceGate4",
    ok,
    ok
      ? "Auth roles, OIDC wiring, and governance endpoints are present; runtime proof still required for Gate 4 closure"
      : "Gate 4 auth/governance wiring is incomplete; runtime proof still required for Gate 4 closure",
    checks
  );
}

export function validateFinalLaunchReadiness(root: string): RepoValidatorResult {
  const checks = [
    "LAUNCH_BLOCKERS.md",
    "VALIDATION_MATRIX.md",
    "READINESS_SCORECARD.json",
    "FINAL_LAUNCH_READINESS_CRITERIA.md",
    "release-evidence/manifest.json",
    "release-evidence/proof_profile.json",
    "release-evidence/runtime/builder_quality_benchmark.json",
    "release-evidence/runtime/ops_observability.json",
    "release-evidence/runtime/gate_negative_paths.json",
    "release-evidence/runtime/ui_control_plane_workflow.json",
  ];
  const fileOk = checks.every((p) => has(root, p));
  if (!fileOk) {
    return result(
      "Validate-Botomatic-FinalLaunchReadiness",
      false,
      "Final launch readiness bundle is incomplete.",
      checks
    );
  }

  let manifest: any;
  let profile: any;
  let benchmark: any;
  let blockers = "";
  try {
    blockers = read(root, "LAUNCH_BLOCKERS.md");
    manifest = JSON.parse(read(root, "release-evidence/manifest.json"));
    profile = JSON.parse(read(root, "release-evidence/proof_profile.json"));
    benchmark = JSON.parse(read(root, "release-evidence/runtime/builder_quality_benchmark.json"));
  } catch {
    return result(
      "Validate-Botomatic-FinalLaunchReadiness",
      false,
      "Final launch readiness metadata could not be parsed.",
      checks
    );
  }

  const subordinateResults: RepoValidatorResult[] = [
    validateArchitecture(root),
    validateBuilderCapability(root),
    validateUIReadiness(root),
    validateSecurity(root),
    validateGovernance(root),
    validateReliability(root),
    validateObservability(root),
    validateLaunchReadiness(root),
    validateDeploymentRollbackGate5(root),
    validateDocumentation(root),
    validateAuthGovernanceGate4(root),
    validateUIControlPlaneIntegration(root),
    validateBuilderQualityBenchmarks(root),
    validateBehavioralRuntimeCoverage(root),
    validateObservabilityRuntimeEvidence(root),
    validateProductionProofProfile(root),
  ];
  const allValidatorsPass = subordinateResults.every((r) => r.status === "passed");

  const enterpriseReadyTrue = manifest?.launchClaim?.enterpriseReady === true;
  const blockedByEmpty = Array.isArray(manifest?.launchClaim?.blockedBy) && manifest.launchClaim.blockedBy.length === 0;
  const enterpriseProductionProofTrue = profile?.enterpriseProductionProof === true;
  const proofGradeProductionLike = isProductionLikeProofGrade(profile?.proofGrade);

  const gates = manifest?.gates && typeof manifest.gates === "object" ? Object.entries(manifest.gates) : [];
  const closedByProof = gates.filter(([, gate]: [string, any]) => gate?.status === "closed_by_proof");
  const allClosedByProofHaveEvidence = closedByProof.every(([, gate]: [string, any]) => typeof gate?.evidencePath === "string" && gate.evidencePath.length > 0 && has(root, gate.evidencePath));

  const requiredClosedGates = ["gate2", "gate3", "gate4", "gate5", "gate6", "gate7"];
  const requiredClosedGatesSatisfied = requiredClosedGates.every((gateId) => {
    const gate = manifest?.gates?.[gateId];
    return gate?.status === "closed_by_proof" && typeof gate?.evidencePath === "string" && has(root, gate.evidencePath);
  });

  const p0Section = blockers.split("## P1")[0] || blockers;
  const p0BlockerOnlySection = p0Section.split("## Closure rules")[0] || p0Section;
  const noP0OpenRows = !/\|\s*Gate\s+\d+\s*\|\s*Open\b/i.test(p0Section);
  const noOpenP0BulletBlockers = p0BlockerOnlySection
    .split("\n")
    .map((line) => line.trim())
    .filter((line) => line.startsWith("- "))
    .every((line) => line.startsWith("- ~~") || line.toLowerCase().includes("closed:"));

  const pendingLinkMarkerCount = listTrackedFiles(root)
    .filter((file) => /\.(md|json|ya?ml|txt)$/i.test(file))
    .reduce((count, file) => {
      try {
        return count + (/\bpending-link-required\b/i.test(read(root, file)) ? 1 : 0);
      } catch {
        return count;
      }
    }, 0);
  const noPendingLinkRequiredMarkers = pendingLinkMarkerCount === 0;

  const builderBenchmarkAverage = Number(benchmark?.averageScoreOutOf10 ?? 0);
  const builderBenchmarkAtThreshold = Number.isFinite(builderBenchmarkAverage) && builderBenchmarkAverage >= 8.5;

  const runtimeEvidence = profile?.runtimeEvidence || {};
  const uiOperatorProofExists = typeof runtimeEvidence?.uiControlPlane?.artifactPath === "string" && has(root, runtimeEvidence.uiControlPlane.artifactPath);
  const oidcProofExists = typeof runtimeEvidence?.behavioralNegativePaths?.artifactPath === "string" && has(root, runtimeEvidence.behavioralNegativePaths.artifactPath);
  const deployRollbackProofExists = typeof runtimeEvidence?.behavioralNegativePaths?.artifactPath === "string" && has(root, runtimeEvidence.behavioralNegativePaths.artifactPath);
  const observabilityProofExists = typeof runtimeEvidence?.observabilityOps?.artifactPath === "string" && has(root, runtimeEvidence.observabilityOps.artifactPath);

  const uiOperatorProofProductionLike = isProductionLikeProofGrade(runtimeEvidence?.uiControlPlane?.proofGrade);
  const oidcProofProductionLike = isProductionLikeProofGrade(runtimeEvidence?.behavioralNegativePaths?.proofGrade);
  const deployRollbackProofProductionLike = isProductionLikeProofGrade(runtimeEvidence?.behavioralNegativePaths?.proofGrade);
  const observabilityProofProductionLike = isProductionLikeProofGrade(runtimeEvidence?.observabilityOps?.proofGrade);

  const ok =
    allValidatorsPass &&
    enterpriseReadyTrue &&
    blockedByEmpty &&
    enterpriseProductionProofTrue &&
    proofGradeProductionLike &&
    allClosedByProofHaveEvidence &&
    requiredClosedGatesSatisfied &&
    noP0OpenRows &&
    noOpenP0BulletBlockers &&
    noPendingLinkRequiredMarkers &&
    builderBenchmarkAtThreshold &&
    uiOperatorProofExists &&
    oidcProofExists &&
    deployRollbackProofExists &&
    observabilityProofExists &&
    uiOperatorProofProductionLike &&
    oidcProofProductionLike &&
    deployRollbackProofProductionLike &&
    observabilityProofProductionLike;

  const failedCriteria: string[] = [];
  if (!allValidatorsPass) failedCriteria.push("not_all_validators_passed");
  if (!enterpriseReadyTrue) failedCriteria.push("manifest_launch_claim_not_enterprise_ready");
  if (!blockedByEmpty) failedCriteria.push("manifest_blocked_by_not_empty");
  if (!enterpriseProductionProofTrue) failedCriteria.push("proof_profile_enterprise_production_proof_false");
  if (!proofGradeProductionLike) failedCriteria.push("proof_profile_grade_not_production_like");
  if (!allClosedByProofHaveEvidence) failedCriteria.push("closed_by_proof_gate_missing_evidence");
  if (!requiredClosedGatesSatisfied) failedCriteria.push("required_gate_not_closed_by_proof");
  if (!noP0OpenRows) failedCriteria.push("p0_blocker_row_open");
  if (!noOpenP0BulletBlockers) failedCriteria.push("p0_bullet_blockers_open");
  if (!noPendingLinkRequiredMarkers) failedCriteria.push("pending_link_required_marker_present");
  if (!builderBenchmarkAtThreshold) failedCriteria.push("builder_benchmark_below_8_5");
  if (!uiOperatorProofExists) failedCriteria.push("ui_operator_proof_missing");
  if (!oidcProofExists) failedCriteria.push("oidc_proof_missing");
  if (!deployRollbackProofExists) failedCriteria.push("deploy_rollback_proof_missing");
  if (!observabilityProofExists) failedCriteria.push("observability_proof_missing");
  if (!uiOperatorProofProductionLike) failedCriteria.push("ui_operator_proof_not_production_like");
  if (!oidcProofProductionLike) failedCriteria.push("oidc_proof_not_production_like");
  if (!deployRollbackProofProductionLike) failedCriteria.push("deploy_rollback_proof_not_production_like");
  if (!observabilityProofProductionLike) failedCriteria.push("observability_proof_not_production_like");

  return result(
    "Validate-Botomatic-FinalLaunchReadiness",
    ok,
    ok
      ? "Final launch readiness gate passed with production-like proof and zero launch blockers."
      : `Final launch readiness remains blocked: ${failedCriteria.join(", ")}.`,
    checks
  );
}

export function validateBehavioralRuntimeCoverage(root: string): RepoValidatorResult {
  const checks = [
    "release-evidence/runtime/gate_negative_paths.json",
  ];

  if (!has(root, checks[0])) {
    return result(
      "Validate-Botomatic-BehavioralRuntimeCoverage",
      false,
      "Behavioral runtime evidence is missing. Run npm run validate:behavioral with runtime env configured.",
      checks
    );
  }

  let payload: any;
  try {
    payload = JSON.parse(read(root, checks[0]));
  } catch {
    return result(
      "Validate-Botomatic-BehavioralRuntimeCoverage",
      false,
      "Behavioral runtime evidence JSON is invalid.",
      checks
    );
  }

  const summary = payload?.summary || {};
  const checkNames = Array.isArray(payload?.suite?.checks)
    ? payload.suite.checks.map((c: any) => c?.name)
    : [];

  const requiredChecks = [
    "unauthorized_dispatch_denied",
    "blocked_governance_promote",
    "replay_restricted_before_approval",
    "blocked_promote_before_ready",
    "rollback_requires_promoted_state",
    "audit_contains_governance_event",
  ];

  const hasAllChecks = requiredChecks.every((name) => checkNames.includes(name));
  const ok = Number(summary.failed || 0) === 0 && hasAllChecks;
  const proofGrade = payload?.proofGrade === "production_like" ? "production-like" : "local";

  return result(
    "Validate-Botomatic-BehavioralRuntimeCoverage",
    ok,
    ok
      ? `Behavioral runtime negative-path checks passed (${proofGrade} proof).`
      : `Behavioral runtime checks are incomplete or failing (${proofGrade} proof).`,
    checks
  );
}

export function validateUIControlPlaneIntegration(root: string): RepoValidatorResult {
  const checks = [
    "apps/control-plane/src/app/projects/[projectId]/page.tsx",
    "apps/control-plane/src/components/overview/AuditPanel.tsx",
    "apps/control-plane/src/services/audit.ts",
  ];
  const fileOk = checks.every((p) => has(root, p));
  const page = fileOk ? read(root, "apps/control-plane/src/app/projects/[projectId]/page.tsx") : "";
  const ok =
    fileOk &&
    page.includes("<OverviewPanel") &&
    page.includes("<GatePanel") &&
    page.includes("<PacketPanel") &&
    page.includes("<ArtifactPanel") &&
    page.includes("<DeploymentPanel") &&
    page.includes("<AuditPanel");
  return result(
    "Validate-Botomatic-UIControlPlaneIntegration",
    ok,
    ok
      ? "Core control-plane panels are mounted in the project page."
      : "One or more core control-plane panels are not mounted in the project page.",
    checks
  );
}

export function validateBuilderQualityBenchmarks(root: string): RepoValidatorResult {
  const checks = [
    "release-evidence/benchmarks/builder_quality_cases.json",
    "release-evidence/runtime/builder_quality_benchmark.json",
  ];

  const fileOk = checks.every((p) => has(root, p));
  if (!fileOk) {
    return result(
      "Validate-Botomatic-BuilderQualityBenchmarks",
      false,
      "Builder quality benchmark evidence is missing. Run npm run benchmark:builder.",
      checks
    );
  }

  let payload: any;
  try {
    payload = JSON.parse(read(root, "release-evidence/runtime/builder_quality_benchmark.json"));
  } catch {
    return result(
      "Validate-Botomatic-BuilderQualityBenchmarks",
      false,
      "Builder quality benchmark artifact is invalid JSON.",
      checks
    );
  }

  const avg = Number(payload?.averageScoreOutOf10 || 0);
  const hasCases = Array.isArray(payload?.cases) && payload.cases.length >= 8;
  const ok = hasCases && avg >= 8.5;
  const proofGrade = payload?.proofGrade === "production_like" ? "production-like" : "local";

  return result(
    "Validate-Botomatic-BuilderQualityBenchmarks",
    ok,
    ok
      ? `Builder quality benchmark is present with average ${avg}/10 across >=8 cases (${proofGrade} proof).`
      : `Builder benchmark average is below threshold or incomplete (${avg}/10, ${proofGrade} proof).`,
    checks
  );
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
    validateDeploymentRollbackGate5(root),
    validateDocumentation(root),
    validateAuthGovernanceGate4(root),
    validateUIControlPlaneIntegration(root),
    validateBuilderQualityBenchmarks(root),
    validateBehavioralRuntimeCoverage(root),
    validateObservabilityRuntimeEvidence(root),
    validateProductionProofProfile(root),
    validateFinalLaunchReadiness(root),
  ];
}
