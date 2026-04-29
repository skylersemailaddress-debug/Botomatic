import fs from "fs";
import path from "path";
import { validateUniversalBuilderReadiness } from "./repoValidators/universalBuilderReadiness";
import { validateSelfUpgradingFactoryReadiness } from "./repoValidators/selfUpgradingFactoryReadiness";
import { validateDirtyRepoRescueReadiness } from "./repoValidators/dirtyRepoRescueReadiness";
import { validateUniversalCapabilityStressReadiness } from "./repoValidators/universalCapabilityStressReadiness";
import { validateMultiDomainEmittedOutputReadiness } from "./repoValidators/multiDomainEmittedOutputReadiness";
import { validateDomainRuntimeCommandExecutionReadiness } from "./repoValidators/domainRuntimeCommandExecutionReadiness";
import { validateExternalIntegrationDeploymentReadiness } from "./repoValidators/externalIntegrationDeploymentReadiness";
import { validateDeploymentDryRunReadiness } from "./repoValidators/deploymentDryRunReadiness";
import { validateCredentialedDeploymentReadiness } from "./repoValidators/credentialedDeploymentReadiness";
import { validateLiveDeploymentExecutionReadiness } from "./repoValidators/liveDeploymentExecutionReadiness";
import { validateFinalCommercialReleaseEvidence } from "./repoValidators/finalCommercialReleaseEvidence";
import { validateFinalReleaseEvidenceLock } from "./repoValidators/finalReleaseEvidenceLock";
import { validateSecretsCredentialManagementReadiness } from "./repoValidators/secretsCredentialManagementReadiness";
import { validateAutonomousComplexBuildReadiness } from "./repoValidators/autonomousComplexBuildReadiness";
import { validateDomainQualityScorecardsReadiness } from "./repoValidators/domainQualityScorecardsReadiness";
import { validateEvalSuiteReadiness } from "./repoValidators/evalSuiteReadiness";
import { validateSecurityCenterReadiness } from "./repoValidators/securityCenterReadiness";
import { validateFirstRunExperienceReadiness } from "./repoValidators/firstRunExperienceReadiness";
import { validateValidationCacheReadiness } from "./repoValidators/validationCacheReadiness";
import { validateInstallerRuntimeReadiness } from "./repoValidators/installerRuntimeReadiness";
import { validateLargeFileIntakeReadiness } from "./repoValidators/largeFileIntakeReadiness";
import { validateMultiSourceIntakeReadiness } from "./repoValidators/multiSourceIntakeReadiness";
import { validateChatBehaviorExecution } from "./repoValidators/chatBehaviorExecution";
import { validateFailureClassificationReadiness } from "./repoValidators/failureClassificationReadiness";
import { validateAdaptiveRepairStrategyReadiness } from "./repoValidators/adaptiveRepairStrategyReadiness";
import { validateUploadPlanHandoffReadiness } from "./repoValidators/uploadPlanHandoffReadiness";
import { validateDashboardRouteIntegrityReadiness } from "./repoValidators/dashboardRouteIntegrityReadiness";
import { validateClaimBoundaryReadiness } from "./repoValidators/claimBoundaryReadiness";
import { validateGeneratedAppNoPlaceholderValidatorReadiness } from "./repoValidators/generatedAppNoPlaceholderValidatorReadiness";
import { validateGeneratedAppCommercialReadinessGateReadiness } from "./repoValidators/generatedAppCommercialReadinessGateReadiness";
import { validateGeneratedAppCorpusHarnessReadiness } from "./repoValidators/generatedAppCorpusHarnessReadiness";
import { validateGeneratedAppRepresentativeCorpusReadiness } from "./repoValidators/generatedAppRepresentativeCorpusReadiness";
import { validateMasterTruthSpecReadiness } from "./repoValidators/masterTruthSpecReadiness";
import { validateEditableUIDocumentModelReadiness } from "./repoValidators/editableUIDocumentModelReadiness";
import { validateUIEditCommandParserReadiness } from "./repoValidators/uiEditCommandParserReadiness";
import { validateLiveUIBuilderCoreReadiness } from "./repoValidators/liveUIBuilderCoreReadiness";

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

function listFilesRecursive(dir: string): string[] {
  if (!fs.existsSync(dir)) return [];
  const out: string[] = [];
  for (const entry of fs.readdirSync(dir)) {
    const full = path.join(dir, entry);
    const stat = fs.statSync(full);
    if (stat.isDirectory()) {
      out.push(...listFilesRecursive(full));
    } else {
      out.push(full);
    }
  }
  return out;
}

export function validateArchitecture(root: string): RepoValidatorResult {
  const checks = [
    "apps/orchestrator-api/src/bootstrap.ts",
    "apps/orchestrator-api/src/server_app.ts",
    "apps/orchestrator-api/src/config.ts",
  ];
  const fileOk = checks.every((p) => has(root, p));
  const server = fileOk ? read(root, "apps/orchestrator-api/src/server_app.ts") : "";
  const runtimeRoutesOk =
    server.includes("/api/projects/intake") &&
    server.includes("/spec/build-contract") &&
    server.includes("/compile") &&
    server.includes("/plan") &&
    server.includes("/dispatch/execute-next") &&
    server.includes("/repair/replay") &&
    server.includes("/ui/overview") &&
    server.includes("/ui/gate");
  const ok = fileOk && runtimeRoutesOk;
  return result(
    "Validate-Botomatic-Architecture",
    ok,
    ok ? "API entrypoint, core runtime routes, and app wiring are present." : "Missing one or more core backend entrypoint files or runtime routes.",
    checks
  );
}

export function validateBuilderCapability(root: string): RepoValidatorResult {
  const checks = [
    "packages/master-truth/src/compiler.ts",
    "packages/packet-engine/src/generator.ts",
    "packages/execution/src/runner.ts",
    "packages/executor-adapters/src/mockExecutor.ts",
  ];
  const fileOk = checks.every((p) => has(root, p));
  const generator = fileOk ? read(root, "packages/packet-engine/src/generator.ts") : "";
  const blueprints = has(root, "packages/blueprints/src/registry.ts") ? read(root, "packages/blueprints/src/registry.ts") : "";
  const coverageOk =
    generator.includes("Define product truth and build contract") &&
    generator.includes("Create deployment configuration and environment manifest") &&
    generator.includes("Produce launch packet and readiness summary") &&
    blueprints.includes("blueprintRegistry") &&
    (blueprints.match(/\bimport\s+\{\s*\w+\s*\}\s+from\s+"\.\/blueprints\//g) || []).length >= 20;
  const ok = fileOk && coverageOk;
  return result(
    "Validate-Botomatic-BuilderCapability",
    ok,
    ok ? "Compile, plan, execution, adapter, and broad blueprint coverage are present." : "Builder pipeline capability is incomplete or shallow.",
    checks
  );
}

export function validateUIReadiness(root: string): RepoValidatorResult {
  const checks = [
    "apps/control-plane/src/app/projects/[projectId]/page.tsx",
    "apps/control-plane/src/app/projects/[projectId]/vibe/page.tsx",
    "apps/control-plane/src/app/projects/[projectId]/advanced/page.tsx",
    "apps/control-plane/src/components/builder/NorthStarBuilderShell.tsx",
    "apps/control-plane/src/components/shell/ProductionPageShell.tsx",
    "apps/control-plane/src/components/vibe/VibeDashboard.tsx",
    "apps/control-plane/src/components/pro/ProDashboard.tsx",
    "apps/control-plane/src/styles/tokens.css",
    "apps/control-plane/src/styles/globals.css",
  ];

  const fileOk = checks.every((p) => has(root, p));
  if (!fileOk) {
    return result("Validate-Botomatic-UIReadiness", false, "One or more required control-plane UI surfaces are missing.", checks);
  }

  const projectPage = read(root, "apps/control-plane/src/app/projects/[projectId]/page.tsx");
  const vibePage = read(root, "apps/control-plane/src/app/projects/[projectId]/vibe/page.tsx");
  const advancedPage = read(root, "apps/control-plane/src/app/projects/[projectId]/advanced/page.tsx");
  const vibeDashboard = read(root, "apps/control-plane/src/components/vibe/VibeDashboard.tsx");
  const proDashboard = read(root, "apps/control-plane/src/components/pro/ProDashboard.tsx");
  const productionShell = read(root, "apps/control-plane/src/components/shell/ProductionPageShell.tsx");
  const northStarShell = read(root, "apps/control-plane/src/components/builder/NorthStarBuilderShell.tsx");
  const globals = read(root, "apps/control-plane/src/styles/globals.css");
  const tokenCss = read(root, "apps/control-plane/src/styles/tokens.css");
  const uiFiles = listFilesRecursive(path.join(root, "apps/control-plane/src"))
    .filter((p) => /\.(ts|tsx|css)$/.test(p));
  const uiText = uiFiles.map((filePath) => read(root, path.relative(root, filePath))).join("\n").toLowerCase();

  const hasDesignSystemSignals =
    tokenCss.includes("--space-") &&
    tokenCss.includes("--radius-") &&
    tokenCss.includes("--shadow") &&
    globals.toLowerCase().includes("font-family") &&
    globals.toLowerCase().includes("@media");

  const hasStateSignals =
    uiText.includes("loading") &&
    uiText.includes("error") &&
    uiText.includes("empty");

  const noPlaceholderUi =
    !uiText.includes("coming soon") &&
    !uiText.includes("todo") &&
    !uiText.includes("fixme") &&
    !uiText.includes("fake demo data");

  const routeShellAlignment =
    projectPage.includes("<VibeBuilderSkeleton") &&
    vibePage.includes("<VibeDashboard") &&
    advancedPage.includes("<ProDashboard");

  const vibeSurfaceSignals =
    vibeDashboard.includes("Vibe Mode") &&
    vibeDashboard.includes("Build Map") &&
    vibeDashboard.includes("One-Click Launch") &&
    vibeDashboard.includes("Improve Design") &&
    vibeDashboard.includes("Launch App");

  const proSurfaceSignals =
    proDashboard.includes("Pro Mode") &&
    proDashboard.includes("Build Pipeline") &&
    proDashboard.includes("Code Changes") &&
    proDashboard.includes("Live Application") &&
    proDashboard.includes("System Health") &&
    proDashboard.includes("Services") &&
    proDashboard.includes("Database Schema") &&
    proDashboard.includes("Test Results") &&
    proDashboard.includes("Terminal") &&
    proDashboard.includes("AI Copilot") &&
    proDashboard.includes("Deploy");

  const shellToggleGuardText = `${productionShell}\n${northStarShell}`.toLowerCase();
  const hasNoGlobalModeToggleLanguage =
    !shellToggleGuardText.includes("choose mode") &&
    !shellToggleGuardText.includes("switch to vibe") &&
    !shellToggleGuardText.includes("switch to pro") &&
    !shellToggleGuardText.includes("vibe/pro mode toggle") &&
    !shellToggleGuardText.includes("dual-mode toggle") &&
    !shellToggleGuardText.includes("workspace mode switcher");

  const ok =
    hasDesignSystemSignals &&
    hasStateSignals &&
    noPlaceholderUi &&
    routeShellAlignment &&
    vibeSurfaceSignals &&
    proSurfaceSignals &&
    hasNoGlobalModeToggleLanguage;
  return result(
    "Validate-Botomatic-UIReadiness",
    ok,
    ok ? "Enterprise control-plane UI surfaces and quality signals are present." : "UI readiness is incomplete (design system, state handling, panel wiring, or placeholder guard failed).",
    checks
  );
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
  const oidcProofPath = "release-evidence/runtime/oidc_rbac_governance_production_like.json";
  const oidcProof = has(root, oidcProofPath) ? JSON.parse(read(root, oidcProofPath)) : null;
  const oidcChecks = Array.isArray(oidcProof?.checks) ? oidcProof.checks.map((c: any) => c?.name) : [];
  const oidcRuntimeOk =
    Number(oidcProof?.summary?.failed || 0) === 0 &&
    ["invalid_issuer_denied", "invalid_audience_denied", "expired_token_denied", "reviewer_denied_admin_route"].every((name) => oidcChecks.includes(name));
  const ok =
    fileOk &&
    server.includes("requireRole(\"admin\"") &&
    server.includes("verifyOidcBearerToken") &&
    server.includes("requireApiAuth(config)") &&
    oidcRuntimeOk;
  return result(
    "Validate-Botomatic-Security",
    ok,
    ok ? "OIDC verification, role-enforced routes, and runtime negative-path auth proof are present." : "OIDC or route-level auth enforcement/runtime proof is incomplete.",
    checks
  );
}

export function validateGovernance(root: string): RepoValidatorResult {
  const checks = [
    "apps/control-plane/src/components/overview/GatePanel.tsx",
    "apps/control-plane/src/components/overview/DeploymentPanel.tsx",
    "apps/orchestrator-api/src/server_app.ts",
  ];
  const fileOk = checks.every((p) => has(root, p));
  const server = fileOk ? read(root, "apps/orchestrator-api/src/server_app.ts") : "";
  const behavioralPath = "release-evidence/runtime/gate_negative_paths.json";
  const behavioral = has(root, behavioralPath) ? JSON.parse(read(root, behavioralPath)) : null;
  const behavioralChecks = Array.isArray(behavioral?.suite?.checks) ? behavioral.suite.checks.map((c: any) => c?.name) : [];
  const governanceRuntimeOk =
    Number(behavioral?.summary?.failed || 0) === 0 &&
    ["blocked_governance_promote", "audit_contains_governance_event"].every((name) => behavioralChecks.includes(name));
  const ok =
    fileOk &&
    server.includes("/ui/gate") &&
    server.includes("/deploy/promote") &&
    server.includes("Cannot promote: gate not ready") &&
    governanceRuntimeOk;
  return result(
    "Validate-Botomatic-Governance",
    ok,
    ok ? "Gate-aware promotion and governance runtime proof are present." : "Governance/gate wiring or runtime proof is incomplete.",
    checks
  );
}

export function validateReliability(root: string): RepoValidatorResult {
  const checks = [
    "packages/supabase-adapter/src/jobClient.ts",
    "apps/orchestrator-api/src/server_app.ts",
  ];
  const fileOk = checks.every((p) => has(root, p));
  const server = fileOk ? read(root, "apps/orchestrator-api/src/server_app.ts") : "";
  const gate5Path = "release-evidence/runtime/production-external/DURABLE_DEPLOY_ROLLBACK_RESTART_PROOF_2026-04-24.md";
  const reliabilityRuntimeOk = has(root, gate5Path);
  const ok =
    fileOk &&
    server.includes("claimJob") &&
    server.includes("finalizeJob") &&
    server.includes("repair/replay") &&
    server.includes("workerTick") &&
    reliabilityRuntimeOk;
  return result(
    "Validate-Botomatic-Reliability",
    ok,
    ok ? "Queue worker, finalize path, replay controls, and durability proof evidence exist." : "Queue/replay reliability wiring or durability evidence is incomplete.",
    checks
  );
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
  const observabilityProofPath = "release-evidence/runtime/ops_observability.json";
  const observabilityProof = has(root, observabilityProofPath) ? JSON.parse(read(root, observabilityProofPath)) : null;
  const observabilitySummary = observabilityProof?.summary || {};
  const observabilityRuntimeOk = Number(observabilitySummary?.failed || 0) === 0;
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
    server.includes("x-request-id") &&
    observabilityRuntimeOk;
  return result(
    "Validate-Botomatic-Observability",
    ok,
    ok ? "Audit API, ops endpoints, request correlation, alert sink wiring, and runtime observability proof exist." : "Observability wiring or runtime evidence is incomplete (audit/ops/correlation/alerts).",
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
  if (!fileOk) {
    return result("Validate-Botomatic-LaunchReadiness", false, "Launch-readiness gate wiring is incomplete.", checks);
  }
  const server = read(root, "apps/orchestrator-api/src/server_app.ts");
  const manifest = has(root, "release-evidence/manifest.json")
    ? JSON.parse(read(root, "release-evidence/manifest.json"))
    : null;
  const benchmark = has(root, "release-evidence/runtime/builder_quality_benchmark.json")
    ? JSON.parse(read(root, "release-evidence/runtime/builder_quality_benchmark.json"))
    : null;
  const runtimeProofsPresent = [
    "release-evidence/runtime/greenfield_runtime_proof.json",
    "release-evidence/runtime/dirty_repo_runtime_proof.json",
    "release-evidence/runtime/self_upgrade_runtime_proof.json",
    "release-evidence/runtime/universal_pipeline_runtime_proof.json",
  ].every((rel) => has(root, rel));

  const runtimeRoutesOk =
    server.includes("buildGate(") &&
    server.includes("launchStatus") &&
    server.includes("Cannot promote: gate not ready");

  const benchmarkOk =
    Number(benchmark?.averageScoreOutOf10 || 0) >= 8.5 &&
    Number(benchmark?.universalScoreOutOf10 || 0) >= 9.2 &&
    Number(benchmark?.criticalFailures || 0) === 0 &&
    benchmark?.launchablePass === true &&
    benchmark?.universalPass === true;

  const manifestLaunchTruth =
    manifest?.launchClaim?.universalBuilderReady === true &&
    Array.isArray(manifest?.launchClaim?.universalBuilderBlockedBy) &&
    manifest.launchClaim.universalBuilderBlockedBy.length === 0;

  const ok = runtimeRoutesOk && runtimeProofsPresent && benchmarkOk && manifestLaunchTruth;
  return result(
    "Validate-Botomatic-LaunchReadiness",
    ok,
    ok ? "Gate logic, strict benchmark, runtime proof set, and launch truth alignment are present." : "Launch-readiness gate evidence is incomplete or inconsistent.",
    checks
  );
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
    "README.md",
    "release-evidence/manifest.json",
  ];
  const fileOk = checks.every((p) => has(root, p));
  if (!fileOk) {
    return result("Validate-Botomatic-Documentation", false, "Required launch documentation files are missing.", checks);
  }

  let blockers = "";
  let scorecard: any;
  let manifest: any;
  let readme = "";

  try {
    blockers = read(root, "LAUNCH_BLOCKERS.md");
    scorecard = JSON.parse(read(root, "READINESS_SCORECARD.json"));
    manifest = JSON.parse(read(root, "release-evidence/manifest.json"));
    readme = read(root, "README.md").toLowerCase();
  } catch {
    return result("Validate-Botomatic-Documentation", false, "Launch documentation metadata could not be parsed.", checks);
  }

  const universalSection = blockers.includes("### Universal Builder P0 (Current)")
    ? (blockers.split("### Universal Builder P0 (Current)")[1] || "").split("### Legacy Enterprise Gate Closure Ledger")[0] || ""
    : "";
  const openUniversalP0 = universalSection
    .split("\n")
    .map((line) => line.trim())
    .filter((line) => line.startsWith("- Open:"));
  const hasOpenUniversalP0 = openUniversalP0.length > 0;

  const scorecardLaunchAllowed = scorecard?.universal_builder_track?.launch_claim_allowed === true;
  const manifestLaunchAllowed = manifest?.launchClaim?.universalBuilderReady === true;
  const manifestBlockedBy = Array.isArray(manifest?.launchClaim?.universalBuilderBlockedBy)
    ? manifest.launchClaim.universalBuilderBlockedBy
    : [];
  const readmeNotReady = readme.includes("universal-builder launch claim: not ready");
  const readmeReady = readme.includes("universal-builder launch gates satisfied");

  const alignmentOk = hasOpenUniversalP0
    ? !scorecardLaunchAllowed && !manifestLaunchAllowed && manifestBlockedBy.length >= 1 && readmeNotReady
    : scorecardLaunchAllowed && manifestLaunchAllowed && manifestBlockedBy.length === 0 && readmeReady && !readmeNotReady;

  return result(
    "Validate-Botomatic-Documentation",
    alignmentOk,
    alignmentOk
      ? "Core scope, blockers, validation matrix, scorecard, and launch-truth alignment docs are consistent."
      : "Launch-truth documentation is inconsistent across blockers/scorecard/manifest/README.",
    checks
  );
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
  const legacyP0Section = p0Section.includes("### Legacy Enterprise Gate Closure Ledger")
    ? p0Section.split("### Legacy Enterprise Gate Closure Ledger")[1]
    : p0Section;
  const p0PolicyPresent = blockers.includes(
    "No audit may claim enterprise readiness while any P0 blocker remains open."
  );

  const noOpenP0Rows = !/\|\s*Gate\s+\d+\s*\|\s*Open\b/i.test(legacyP0Section);
  const noOpenP0Bullets = legacyP0Section
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
    "apps/control-plane/src/app/projects/[projectId]/advanced/page.tsx",
    "apps/control-plane/src/app/projects/[projectId]/settings/page.tsx",
    "apps/control-plane/src/app/projects/[projectId]/evidence/page.tsx",
    "apps/control-plane/src/app/projects/[projectId]/deployment/page.tsx",
    "apps/control-plane/src/app/projects/[projectId]/logs/page.tsx",
    "apps/control-plane/src/components/overview/AuditPanel.tsx",
    "apps/control-plane/src/services/audit.ts",
    "apps/control-plane/src/services/spec.ts",
    "apps/control-plane/src/services/overview.ts",
    "apps/control-plane/src/services/packets.ts",
    "apps/control-plane/src/services/deployments.ts",
  ];
  const fileOk = checks.every((p) => has(root, p));
  const page = fileOk ? read(root, "apps/control-plane/src/app/projects/[projectId]/page.tsx") : "";
  const advancedPage = fileOk ? read(root, "apps/control-plane/src/app/projects/[projectId]/advanced/page.tsx") : "";
  const settingsPage = fileOk ? read(root, "apps/control-plane/src/app/projects/[projectId]/settings/page.tsx") : "";
  const evidencePage = fileOk ? read(root, "apps/control-plane/src/app/projects/[projectId]/evidence/page.tsx") : "";
  const deploymentPage = fileOk ? read(root, "apps/control-plane/src/app/projects/[projectId]/deployment/page.tsx") : "";
  const logsPage = fileOk ? read(root, "apps/control-plane/src/app/projects/[projectId]/logs/page.tsx") : "";
  const specSvc = fileOk ? read(root, "apps/control-plane/src/services/spec.ts") : "";
  const overviewSvc = fileOk ? read(root, "apps/control-plane/src/services/overview.ts") : "";
  const packetSvc = fileOk ? read(root, "apps/control-plane/src/services/packets.ts") : "";
  const deploySvc = fileOk ? read(root, "apps/control-plane/src/services/deployments.ts") : "";
  const servicesUseRealApi =
    specSvc.includes("/spec/status") &&
    overviewSvc.includes("/ui/overview") &&
    packetSvc.includes("/ui/packets") &&
    packetSvc.includes("/ui/artifacts") &&
    deploySvc.includes("/ui/deployments") &&
    deploySvc.includes("/deploy/promote");
  const ok =
    fileOk &&
    page.includes("<VibeBuilderSkeleton") &&
    advancedPage.includes("<ProDashboard") &&
    settingsPage.includes("<GatePanel") &&
    settingsPage.includes("<LaunchReadinessPanel") &&
    evidencePage.includes("<ProofValidationPanel") &&
    evidencePage.includes("<PacketPanel") &&
    evidencePage.includes("<ArtifactPanel") &&
    deploymentPage.includes("<DeploymentPanel") &&
    logsPage.includes("<AuditPanel") &&
    servicesUseRealApi;
  return result(
    "Validate-Botomatic-UIControlPlaneIntegration",
    ok,
    ok
      ? "Core enterprise control-plane panels are mounted and backed by real API services."
      : "One or more core enterprise control-plane panels or service API mappings are missing.",
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
  const universalScore = Number(payload?.universalScoreOutOf10 || 0);
  const hasCases = Array.isArray(payload?.cases) && payload.cases.length >= 31;
  const launchThreshold = Number(payload?.thresholdTarget || 0);
  const universalThreshold = Number(payload?.thresholdUniversalTarget || 0);
  const criticalFailures = Number(payload?.criticalFailures || 0);
  const placeholderFailures = Number(payload?.placeholderFailures || 0);
  const caseFailures = Number(payload?.caseFailures || 0);

  const requiredCaseFields = [
    "id",
    "appName",
    "buildContract",
    "blueprintMatch",
    "generatedPlan",
    "generatedPackets",
    "validationSignals",
    "scoreOutOf10",
    "criticalFailures",
    "launchablePass",
    "noPlaceholderPass",
    "commercialReadinessPass",
  ];

  const cases = Array.isArray(payload?.cases) ? payload.cases : [];
  const caseSchemaOk = cases.every((item: any) => {
    const hasDomainDescriptor =
      Object.prototype.hasOwnProperty.call(item || {}, "appType") ||
      Object.prototype.hasOwnProperty.call(item || {}, "domain");
    return hasDomainDescriptor && requiredCaseFields.every((field) => Object.prototype.hasOwnProperty.call(item || {}, field));
  });

  const perCaseStrictnessOk = cases.every((item: any) => {
    const validationSignals = item?.validationSignals || {};
    const fakeSignalsPresent =
      Boolean(validationSignals.fakeAuthSignal ?? validationSignals.fakeAuthSignals) ||
      Boolean(validationSignals.fakePaymentSignal ?? validationSignals.fakePaymentSignals) ||
      Boolean(validationSignals.fakeIntegrationSignal ?? validationSignals.fakeIntegrationSignals);

    const missingRequiredCoverage =
      validationSignals.requiredTestsPresent === false ||
      validationSignals.requiredDeployPresent === false ||
      validationSignals.requiredSecurityPresent === false ||
      validationSignals.requiredDocsPresent === false;

    const placeholderSignal =
      validationSignals.productionPlaceholderSignal === true ||
      validationSignals.hasPlaceholderPaths === true;

    const criticalList = Array.isArray(item?.criticalFailures) ? item.criticalFailures : [];
    const caseClaimsPass = item?.launchablePass === true;

    if (caseClaimsPass && (fakeSignalsPresent || missingRequiredCoverage || placeholderSignal || criticalList.length > 0)) {
      return false;
    }

    return true;
  });

  const universalClaimConsistency = payload?.universalPass === true ? universalScore >= 9.2 : true;

  const ok =
    hasCases &&
    launchThreshold >= 8.5 &&
    universalThreshold >= 9.2 &&
    avg >= 8.5 &&
    universalScore >= 9.2 &&
    criticalFailures === 0 &&
    placeholderFailures === 0 &&
    caseFailures === 0 &&
    payload?.launchablePass === true &&
    payload?.universalPass === true &&
    caseSchemaOk &&
    perCaseStrictnessOk &&
    universalClaimConsistency;
  const proofGrade = payload?.proofGrade === "production_like" ? "production-like" : "local";

  return result(
    "Validate-Botomatic-BuilderQualityBenchmarks",
    ok,
    ok
      ? `Builder quality benchmark passed strict thresholds (${avg}/10 launchable, ${universalScore}/10 universal, ${proofGrade} proof).`
      : `Builder benchmark is below strict threshold or has case-level critical failures (${avg}/10 launchable, ${universalScore}/10 universal, ${proofGrade} proof).`,
    checks
  );
}

export function validateFileIngestion(root: string): RepoValidatorResult {
  const checks = [
    "apps/orchestrator-api/src/server_app.ts",
    "apps/orchestrator-api/src/intake/largeFileIntake.ts",
    "apps/control-plane/src/components/chat/Composer.tsx",
    "apps/control-plane/src/services/api.ts",
    "apps/control-plane/src/services/intake.ts",
    "apps/control-plane/src/services/intakeConfig.ts",
  ];
  const fileOk = checks.every((p) => has(root, p));
  if (!fileOk) {
    return result(
      "Validate-Botomatic-FileIngestion",
      false,
      "File ingestion infrastructure files are missing.",
      checks
    );
  }
  const server = read(root, "apps/orchestrator-api/src/server_app.ts");
  const intakeCore = read(root, "apps/orchestrator-api/src/intake/largeFileIntake.ts");
  const composer = read(root, "apps/control-plane/src/components/chat/Composer.tsx");
  const api = read(root, "apps/control-plane/src/services/api.ts");
  const intakeSvc = read(root, "apps/control-plane/src/services/intake.ts");
  const intakeConfig = read(root, "apps/control-plane/src/services/intakeConfig.ts");

  const ok =
    server.includes("/intake/file") &&
    server.includes("multer") &&
    server.includes("upload_started") &&
    intakeCore.includes("DEFAULT_MAX_UPLOAD_MB") &&
    intakeCore.includes("sanitizeArchivePath") &&
    intakeCore.includes("POTENTIAL_SECRET_DETECTED") &&
    intakeCore.includes("TOO_MANY_FILES") &&
    intakeCore.includes("EXTRACTED_SIZE_TOO_LARGE") &&
    composer.includes("onFileUpload") &&
    composer.includes("Upload progress") &&
    composer.includes("onKeyDown") &&
    composer.includes("Shift+Enter") &&
    api.includes("postMultipart") &&
    api.includes("postMultipartWithProgress") &&
    intakeSvc.includes("uploadIntakeFile") &&
    intakeSvc.includes("postMultipartWithProgress") &&
    intakeConfig.includes("NEXT_PUBLIC_BOTOMATIC_MAX_UPLOAD_MB");

  return result(
    "Validate-Botomatic-FileIngestion",
    ok,
    ok
      ? "Large-file upload route, secure archive safeguards, progress wiring, and config-driven UI limits are present."
      : "File ingestion wiring is incomplete (limits/safeguards/progress/composer integration).",
    checks
  );
}

export function validateChatFirstOperatorRouting(root: string): RepoValidatorResult {
  const checks = [
    "apps/orchestrator-api/src/server_app.ts",
    "apps/control-plane/src/components/chat/ConversationPane.tsx",
    "apps/control-plane/src/components/overview/BuildStatusRail.tsx",
    "apps/control-plane/src/components/chat/commandGrammar.ts",
    "apps/control-plane/src/components/chat/intentRouting.ts",
    "apps/control-plane/src/components/chat/selfUpgradeGuard.ts",
    "apps/control-plane/src/components/chat/intakePipeline.ts",
    "apps/control-plane/src/components/chat/nextBestAction.ts",
    "apps/control-plane/src/components/chat/chatCommandExecutor.ts",
    "apps/control-plane/src/components/chat/actionRailCommands.ts",
    "apps/control-plane/src/services/operator.ts",
    "packages/master-truth/src/compiler.ts",
    "packages/validation/src/tests/chatDrivenControl.test.ts",
    "package.json",
  ];

  const fileOk = checks.every((p) => has(root, p));
  if (!fileOk) {
    return result(
      "Validate-Botomatic-ChatFirstOperatorRouting",
      false,
      "Chat-first operator routing files are missing.",
      checks
    );
  }

  const server = read(root, "apps/orchestrator-api/src/server_app.ts");
  const conversation = read(root, "apps/control-plane/src/components/chat/ConversationPane.tsx");
  const rail = read(root, "apps/control-plane/src/components/overview/BuildStatusRail.tsx");
  const grammar = read(root, "apps/control-plane/src/components/chat/commandGrammar.ts");
  const router = read(root, "apps/control-plane/src/components/chat/intentRouting.ts");
  const guard = read(root, "apps/control-plane/src/components/chat/selfUpgradeGuard.ts");
  const intakePipeline = read(root, "apps/control-plane/src/components/chat/intakePipeline.ts");
  const nextAction = read(root, "apps/control-plane/src/components/chat/nextBestAction.ts");
  const executor = read(root, "apps/control-plane/src/components/chat/chatCommandExecutor.ts");
  const railCommands = read(root, "apps/control-plane/src/components/chat/actionRailCommands.ts");
  const operatorSvc = read(root, "apps/control-plane/src/services/operator.ts");
  const compiler = read(root, "packages/master-truth/src/compiler.ts");
  const tests = read(root, "packages/validation/src/tests/chatDrivenControl.test.ts");
  const packageJson = read(root, "package.json");

  const requiredIntents = [
    "intake",
    "planning",
    "generated_app_build",
    "repo_rescue",
    "validation_proof",
    "deployment_readiness",
    "secrets_vault",
    "self_upgrade",
    "blocker_resolution",
    "status_query",
    "general_chat",
  ];

  const requiredRailMappings = [
    "continue current generated app build",
    "inspect failed milestone and recommend repair",
    "explain blocker and propose safe default",
    "run validate all and summarize proof",
    "show latest proof and launch readiness",
    "show missing secrets and recommended setup",
    "prepare deployment readiness, no live deployment",
    "approve current generated app build contract",
    "generate execution plan from uploaded build contract",
  ];

  const requiredSourceTypes = [
    "uploaded_file",
    "uploaded_zip",
    "uploaded_document",
    "github_url",
    "cloud_link",
    "pasted_text",
    "local_manifest_json",
    "existing_project_reference",
  ];

  const requiredPipelineStages = [
    "source_input",
    "intake_source",
    "source_manifest",
    "extracted_context",
    "build_contract_context",
    "planning",
    "execution",
  ];

  const requiredNextActionInputs = [
    "projectStatus",
    "uploadedSpecExists",
    "buildContractApproved",
    "approvalStatus",
    "activeRunId",
    "currentMilestone",
    "completedMilestones",
    "failedMilestone",
    "repairAttempts",
    "blockers",
    "validationStatus",
    "launchGateStatus",
    "missingSecretsCount",
    "proofStatus",
  ];

  const explicitSelfUpgradePhrases = [
    "self-upgrade",
    "self upgrade",
    "upgrade botomatic",
    "modify botomatic",
    "patch botomatic",
    "fix botomatic builder",
    "change botomatic itself",
  ];

  const forbiddenImplicitSelfUpgradePhrases = [
    "build nexus",
    "uploaded spec",
    "update ui",
    "continue build",
    "fix generated app",
    "inspect failed milestone",
    "validate it",
    "what now",
  ];

  const selfUpgradeTriggerMatch = grammar.match(/intent:\s*\"self_upgrade\"[\s\S]*?triggers:\s*\[([\s\S]*?)\]/);
  const selfUpgradeTriggers = selfUpgradeTriggerMatch?.[1] || "";

  const ok =
    server.includes("/operator/send") &&
    server.includes("formatOperatorVoice") &&
    server.includes("hasUncompiledIntake") &&
    server.includes("hasLaunchIntent") &&
    conversation.includes("executeCanonicalCommand") &&
    conversation.includes("buildPartnerEnvelope") &&
    conversation.includes("handleFileUpload") &&
    rail.includes("ACTION_RAIL_COMMANDS") &&
    rail.includes("executeCanonicalCommand") &&
    operatorSvc.includes("/operator/send") &&
    compiler.includes("canonicalSpec") &&
    compiler.includes("productIntent") &&
    compiler.includes("openQuestions") &&
    requiredIntents.every((intent) => grammar.includes(`\"${intent}\"`)) &&
    grammar.includes("CANONICAL_COMMAND_CLASSES") &&
    router.includes("classifyIntent") &&
    router.includes("activeGeneratedAppRun") &&
    router.includes("uploadedSpecExists") &&
    router.includes("build nexus") &&
    router.includes("continue") &&
    router.includes("validate") &&
    router.includes("what now") &&
    explicitSelfUpgradePhrases.every((phrase) => selfUpgradeTriggers.includes(`\"${phrase}\"`)) &&
    forbiddenImplicitSelfUpgradePhrases.every((phrase) => !selfUpgradeTriggers.includes(`\"${phrase}\"`)) &&
    guard.includes("SELF_UPGRADE_EXPLICIT_PHRASES") &&
    guard.includes("Self-upgrade blocked because the user did not explicitly request Botomatic modification") &&
    executor.includes("evaluateSelfUpgradeGuard") &&
    executor.includes("createSelfUpgradeSpec") &&
    executor.includes("intent: \"generated_app_build\"") &&
    executor.includes("runPipelineFromIntakeContext") &&
    requiredRailMappings.every((mapping) => railCommands.includes(mapping)) &&
    requiredSourceTypes.every((sourceType) => intakePipeline.includes(`\"${sourceType}\"`)) &&
    requiredPipelineStages.every((stage) => intakePipeline.includes(stage)) &&
    (executor.includes("source_input -> intake_source -> source_manifest -> extracted_context -> compile -> build_contract_context -> planning -> execution") || executor.includes("source_input -> intake_source -> source_manifest -> extracted_context -> build_contract_context -> planning -> execution")) &&
    requiredNextActionInputs.every((field) => nextAction.includes(field)) &&
    executor.includes("Current state") &&
    executor.includes("Failed milestone") &&
    executor.includes("Failure category") &&
    executor.includes("Evidence") &&
    executor.includes("What I already tried") &&
    executor.includes("Recommended next action") &&
    executor.includes("Risk") &&
    executor.includes("Command I will run") &&
    executor.includes("Need your decision?") &&
    tests.includes("build Nexus from uploaded v11") &&
    tests.includes("generated_app_build") &&
    tests.includes("validate it") &&
    tests.includes("what now") &&
    tests.includes("upgrade Botomatic validator logic") &&
    tests.includes("modify Botomatic itself") &&
    tests.includes("assert.notStrictEqual(classifyIntent(\"build Nexus from uploaded v11\"") &&
    tests.includes("assert.notStrictEqual(classifyIntent(\"continue build\"") &&
    tests.includes("ACTION_RAIL_COMMANDS") &&
    packageJson.includes("test:chat-driven-control") &&
    packageJson.includes("test:universal") &&
    packageJson.includes("test:chat-driven-control");

  return result(
    "Validate-Botomatic-ChatFirstOperatorRouting",
    ok,
    ok
      ? "Chat-first operator route, advanced-only manual controls, and canonical spec v2 compilation are wired."
      : "Chat-first operator routing or canonical spec v2 wiring is incomplete.",
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
    validateFileIngestion(root),
    validateChatFirstOperatorRouting(root),
    validateChatBehaviorExecution(root),
    validateUniversalBuilderReadiness(root),
    validateSelfUpgradingFactoryReadiness(root),
    validateDirtyRepoRescueReadiness(root),
    validateUniversalCapabilityStressReadiness(root),
    validateMultiDomainEmittedOutputReadiness(root),
    validateDomainRuntimeCommandExecutionReadiness(root),
    validateExternalIntegrationDeploymentReadiness(root),
    validateDeploymentDryRunReadiness(root),
    validateCredentialedDeploymentReadiness(root),
    validateLiveDeploymentExecutionReadiness(root),
    validateFinalCommercialReleaseEvidence(root),
    validateFinalReleaseEvidenceLock(root),
    validateSecretsCredentialManagementReadiness(root),
    validateAutonomousComplexBuildReadiness(root),
    validateDomainQualityScorecardsReadiness(root),
    validateEvalSuiteReadiness(root),
    validateSecurityCenterReadiness(root),
    validateFirstRunExperienceReadiness(root),
    validateValidationCacheReadiness(root),
    validateInstallerRuntimeReadiness(root),
    validateLargeFileIntakeReadiness(root),
    validateMultiSourceIntakeReadiness(root),
    validateFailureClassificationReadiness(root),
    validateAdaptiveRepairStrategyReadiness(root),
    validateUploadPlanHandoffReadiness(root),
    validateDashboardRouteIntegrityReadiness(root),
    validateClaimBoundaryReadiness(root),
    validateMasterTruthSpecReadiness(root),
    validateGeneratedAppNoPlaceholderValidatorReadiness(root),
    validateGeneratedAppCommercialReadinessGateReadiness(root),
    validateGeneratedAppCorpusHarnessReadiness(root),
    validateGeneratedAppRepresentativeCorpusReadiness(root),
    validateEditableUIDocumentModelReadiness(root),
    validateUIEditCommandParserReadiness(root),
    validateLiveUIBuilderCoreReadiness(root),
  ];
}
