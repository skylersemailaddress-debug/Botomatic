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
    "apps/orchestrator-api/src/config.ts",
    "apps/control-plane/src/services/ops.ts",
  ];
  const fileOk = checks.every((p) => has(root, p));
  const server = fileOk ? read(root, "apps/orchestrator-api/src/server_app.ts") : "";
  const config = fileOk ? read(root, "apps/orchestrator-api/src/config.ts") : "";
  const ok =
    fileOk &&
    server.includes("/ui/audit") &&
    server.includes("emitEvent(") &&
    server.includes("route_error") &&
    server.includes("emitRouteErrorAlert") &&
    server.includes("alertDeliverySuccessCount") &&
    server.includes("alertDeliveryFailureCount") &&
    server.includes("alertSinkConfigured") &&
    config.includes("BOTOMATIC_ALERT_WEBHOOK_URL") &&
    config.includes("SLACK_WEBHOOK_URL") &&
    server.includes("/api/ops/metrics") &&
    server.includes("/api/ops/errors") &&
    server.includes("/api/ops/queue") &&
    server.includes("x-request-id");
  return result(
    "Validate-Botomatic-Observability",
    ok,
    ok ? "Audit API, ops endpoints, request correlation, and alert sink wiring exist." : "Observability wiring is incomplete (audit/ops/correlation/alerts).",
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

  const isProductionLikeGrade = ["production_like", "staging_production_like", "production"].includes(profile?.proofGrade);
  const hasProductionGaps = Array.isArray(profile?.productionGaps);

  const localStateOk =
    profile?.proofGrade === "local_runtime" &&
    profile?.enterpriseProductionProof === false &&
    hasProductionGaps &&
    profile.productionGaps.length >= 1 &&
    profile?.launchClaimPolicy?.canClaimEnterpriseReady === false &&
    manifest?.launchClaim?.enterpriseReady === false;

  const productionLikeStateOk =
    isProductionLikeGrade &&
    profile?.enterpriseProductionProof === true &&
    hasProductionGaps &&
    profile.productionGaps.length === 0 &&
    manifest?.launchClaim?.enterpriseReady === true &&
    Array.isArray(manifest?.launchClaim?.blockedBy) &&
    manifest.launchClaim.blockedBy.length === 0;

  const ok = localStateOk || productionLikeStateOk;

  return result(
    "Validate-Botomatic-ProductionProofProfile",
    ok,
    ok
      ? "Production-proof profile is internally consistent with launch claim posture."
      : "Production-proof profile and launch claim posture are inconsistent.",
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
    "docs/gate4/GATE4_RUNTIME_PROOF_2026-04-23.md",
    "docs/gate5/GATE5_RUNTIME_PROOF_2026-04-23.md",
    "docs/gate6/GATE6_RUNTIME_PROOF_2026-04-23.md",
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

  let blockers = "";
  let matrix = "";
  let manifest: any;
  let profile: any;
  let oidcRuntimeProof: any = null;

  try {
    blockers = read(root, "LAUNCH_BLOCKERS.md");
    matrix = read(root, "VALIDATION_MATRIX.md");
    manifest = JSON.parse(read(root, "release-evidence/manifest.json"));
    profile = JSON.parse(read(root, "release-evidence/proof_profile.json"));
  } catch {
    return result(
      "Validate-Botomatic-FinalLaunchReadiness",
      false,
      "Final launch readiness metadata could not be parsed.",
      checks
    );
  }

  const oidcArtifactPath = "release-evidence/runtime/oidc_rbac_governance_production_like.json";
  const oidcArtifactExists = has(root, oidcArtifactPath);

  if (oidcArtifactExists) {
    try {
      oidcRuntimeProof = JSON.parse(read(root, oidcArtifactPath));
    } catch {
      oidcRuntimeProof = null;
    }
  }

  const gate2Closed = blockers.includes("| Gate 2 | Closed by proof");
  const gate3Closed = blockers.includes("| Gate 3 | Closed by proof");
  const gate4Closed = blockers.includes("| Gate 4 | Closed by proof");
  const gate5Closed = blockers.includes("| Gate 5 | Closed by proof");
  const gate6Closed = blockers.includes("| Gate 6 | Closed by proof");
  const gate7Closed = blockers.includes("| Gate 7 | Closed by proof");

  const validatorsImplemented =
    matrix.includes("Validate-Botomatic-FinalLaunchReadiness") &&
    matrix.includes("Validate-Botomatic-DeploymentRollbackGate5");

  const manifestAligned =
    manifest?.gates?.gate4?.status === "closed_by_proof" &&
    manifest?.gates?.gate5?.status === "closed_by_proof" &&
    manifest?.gates?.gate6?.status === "closed_by_proof" &&
    manifest?.gates?.gate7?.status === "closed_by_proof";

  const enterpriseReadyTrue = manifest?.launchClaim?.enterpriseReady === true;
  const blockedByEmpty =
    Array.isArray(manifest?.launchClaim?.blockedBy) &&
    manifest.launchClaim.blockedBy.length === 0;

  const enterpriseProductionProofTrue = profile?.enterpriseProductionProof === true;
  const proofGradeProductionLike =
    profile?.proofGrade === "production_like" ||
    profile?.proofGrade === "staging_production_like" ||
    profile?.proofGrade === "production";

  const productionGapsEmpty =
    Array.isArray(profile?.productionGaps) && profile.productionGaps.length === 0;

  const p0Section = blockers.split("## P1")[0] || blockers;
  const p0PolicyPresent = blockers.includes(
    "No audit may claim enterprise readiness while any P0 blocker remains open."
  );

  const noOpenP0Rows = !/\|\s*Gate\s+\d+\s*\|\s*Open\b/i.test(p0Section);
  const noOpenP0Bullets = p0Section
    .split("\n")
    .map((line) => line.trim())
    .filter((line) => line.startsWith("- "))
    .every((line) => line.startsWith("- ~~") || line.toLowerCase().includes("closed:"));

  const oidcCheckNames = Array.isArray(oidcRuntimeProof?.checks)
    ? oidcRuntimeProof.checks.map((c: any) => c?.name)
    : [];

  const oidcCoverage = [
    "invalid_issuer_denied",
    "invalid_audience_denied",
    "expired_token_denied",
    "malformed_role_defaults_safe",
    "operator_denied_dangerous_route",
    "reviewer_denied_admin_route",
    "admin_governance_approval_allowed",
  ].every((name) => oidcCheckNames.includes(name));

  const oidcProofValid =
    oidcArtifactExists && Number(oidcRuntimeProof?.summary?.failed || 0) === 0;

  const failedCriteria: string[] = [];

  if (!gate2Closed) failedCriteria.push("gate2_not_closed_by_proof");
  if (!gate3Closed) failedCriteria.push("gate3_not_closed_by_proof");
  if (!gate4Closed) failedCriteria.push("gate4_not_closed_by_proof");
  if (!gate5Closed) failedCriteria.push("gate5_not_closed_by_proof");
  if (!gate6Closed) failedCriteria.push("gate6_not_closed_by_proof");
  if (!gate7Closed) failedCriteria.push("gate7_not_closed_by_proof");
  if (!validatorsImplemented) failedCriteria.push("required_validators_missing");
  if (!manifestAligned) failedCriteria.push("manifest_gates_not_aligned");
  if (!enterpriseReadyTrue) failedCriteria.push("manifest_launch_claim_not_enterprise_ready");
  if (!blockedByEmpty) failedCriteria.push("manifest_blocked_by_not_empty");
  if (!enterpriseProductionProofTrue) failedCriteria.push("proof_profile_enterprise_production_proof_false");
  if (!proofGradeProductionLike) failedCriteria.push("proof_profile_grade_not_production_like");
  if (!productionGapsEmpty) failedCriteria.push("proof_profile_production_gaps_not_empty");
  if (!noOpenP0Rows || !noOpenP0Bullets || !p0PolicyPresent) failedCriteria.push("p0_bullet_blockers_open");
  if (!oidcArtifactExists || !oidcCoverage || !oidcProofValid) failedCriteria.push("oidc_production_proof_missing_or_incomplete");

  const ok = failedCriteria.length === 0;

  return result(
    "Validate-Botomatic-FinalLaunchReadiness",
    ok,
    ok
      ? "Final launch criteria are satisfied and enterprise launch can be claimed."
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
  const hasCases = Array.isArray(payload?.cases) && payload.cases.length >= 3;
  const ok = hasCases && avg >= 6.0;
  const proofGrade = payload?.proofGrade === "production_like" ? "production-like" : "local";

  return result(
    "Validate-Botomatic-BuilderQualityBenchmarks",
    ok,
    ok
      ? `Builder quality benchmark is present with average ${avg}/10 (${proofGrade} proof).`
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
