import fs from "fs";
import path from "path";
import type { RepoValidatorResult } from "../repoValidators";
import { validateEmittedOutput } from "../generatedApp/validateEmittedOutput";

function has(root: string, rel: string): boolean {
  return fs.existsSync(path.join(root, rel));
}

function read(root: string, rel: string): string {
  return fs.readFileSync(path.join(root, rel), "utf8");
}

function result(ok: boolean, summary: string, checks: string[]): RepoValidatorResult {
  return {
    name: "Validate-Botomatic-UniversalBuilderReadiness",
    status: ok ? "passed" : "failed",
    summary,
    checks,
  };
}

export function validateUniversalBuilderReadiness(root: string): RepoValidatorResult {
  const checks = [
    "packages/spec-engine/src/specModel.ts",
    "packages/spec-engine/src/chatStyleDetector.ts",
    "packages/spec-engine/src/clarificationPlanner.ts",
    "packages/spec-engine/src/assumptionLedger.ts",
    "packages/spec-engine/src/recommendationEngine.ts",
    "packages/spec-engine/src/buildContract.ts",
    "packages/blueprints/src/registry.ts",
    "packages/validation/src/generatedApp/validateGeneratedApp.ts",
    "packages/validation/src/generatedApp/validateNoPlaceholders.ts",
    "packages/validation/src/generatedApp/validateCommercialReadiness.ts",
    "release-evidence/benchmarks/builder_quality_cases.json",
    "release-evidence/runtime/greenfield_runtime_proof.json",
    "release-evidence/runtime/domain_runtime_depth_matrix.json",
    "docs/universal-builder/DOMAIN_LAUNCH_RUBRICS.md",
    "release-evidence/manifest.json",
    "apps/orchestrator-api/src/server_app.ts",
    "README.md",
    "LAUNCH_BLOCKERS.md",
  ];

  if (!checks.every((p) => has(root, p))) {
    return result(false, "Universal builder readiness files are incomplete.", checks);
  }

  const registry = read(root, "packages/blueprints/src/registry.ts");
  const benchmarkCases = JSON.parse(read(root, "release-evidence/benchmarks/builder_quality_cases.json"));
  const benchmarkRuntime = has(root, "release-evidence/runtime/builder_quality_benchmark.json")
    ? JSON.parse(read(root, "release-evidence/runtime/builder_quality_benchmark.json"))
    : null;
  const greenfieldProof = JSON.parse(read(root, "release-evidence/runtime/greenfield_runtime_proof.json"));
  const domainDepthProof = JSON.parse(read(root, "release-evidence/runtime/domain_runtime_depth_matrix.json"));
  const rubric = read(root, "docs/universal-builder/DOMAIN_LAUNCH_RUBRICS.md").toLowerCase();
  const manifest = JSON.parse(read(root, "release-evidence/manifest.json"));
  const server = read(root, "apps/orchestrator-api/src/server_app.ts");
  const readme = read(root, "README.md").toLowerCase();
  const blockersRaw = read(root, "LAUNCH_BLOCKERS.md");
  const blockers = blockersRaw.toLowerCase();

  const benchmarkThreshold = Number(benchmarkRuntime?.thresholdTarget || 0);
  const benchmarkCaseCount = Array.isArray(benchmarkCases) ? benchmarkCases.length : 0;
  const domainMatrix = domainDepthProof?.generatedPlanOrBuildGraph?.domainDepthMatrix;
  const domainResults = Array.isArray(domainMatrix?.results) ? domainMatrix.results : [];
  const domainDetailDepthOk = domainResults.every((result: any) =>
    typeof result?.domainId === "string" &&
    Array.isArray(result?.requiredSpecs) &&
    Array.isArray(result?.buildCommands) &&
    Array.isArray(result?.testCommands) &&
    Array.isArray(result?.validationCommands) &&
    Array.isArray(result?.launchRubric) &&
    Array.isArray(result?.noPlaceholderRules) &&
    Array.isArray(result?.repairStrategy) &&
    typeof result?.readinessStatus === "string" &&
    Boolean(result?.validatorMapped)
  );
  const domainDepthOk =
    Number(domainMatrix?.totalDomains || 0) >= 19 &&
    Number(domainMatrix?.failedDomains || 0) === 0 &&
    domainResults.length >= 19 &&
    domainResults.every((r: any) => r?.status === "passed") &&
    domainDetailDepthOk;

  const universalSection = blockersRaw.includes("### Universal Builder P0 (Current)")
    ? (blockersRaw.split("### Universal Builder P0 (Current)")[1] || "").split("### Legacy Enterprise Gate Closure Ledger")[0] || ""
    : "";
  const openP0Lines = universalSection
    .split("\n")
    .map((line) => line.trim())
    .filter((line) => line.startsWith("- Open:"));
  const hasOpenUniversalP0 = openP0Lines.length > 0;

  const manifestUniversalReady = manifest?.launchClaim?.universalBuilderReady === true;
  const manifestUniversalBlockedBy = Array.isArray(manifest?.launchClaim?.universalBuilderBlockedBy)
    ? manifest.launchClaim.universalBuilderBlockedBy
    : [];
  const launchTruthAligned = hasOpenUniversalP0
    ? !manifestUniversalReady && manifestUniversalBlockedBy.length >= 1 && readme.includes("not ready")
    : manifestUniversalReady && manifestUniversalBlockedBy.length === 0 && !readme.includes("not ready");

  const greenfieldRoutes = Array.isArray(greenfieldProof?.routeExercised) ? greenfieldProof.routeExercised : [];
  const greenfieldValidators = Array.isArray(greenfieldProof?.validatorsRun) ? greenfieldProof.validatorsRun : [];
  const greenfieldOutput = greenfieldProof?.generatedOutputEvidence || {};
  const greenfieldProducedArtifacts = Array.isArray(greenfieldProof?.producedArtifacts) ? greenfieldProof.producedArtifacts : [];
  const hasGreenfieldValidatorPass = greenfieldValidators.some((v: any) => typeof v?.name === "string" && v?.status === "passed");
  const greenfieldGeneratedArtifactDepth =
    greenfieldOutput?.artifactManifestPresent === true &&
    greenfieldOutput?.routesPagesPresent === true &&
    greenfieldOutput?.componentsPresent === true &&
    greenfieldOutput?.apiHandlersPresent === true &&
    greenfieldOutput?.schemaMigrationsPresent === true &&
    greenfieldOutput?.authRbacPresent === true &&
    greenfieldOutput?.formsPresent === true &&
    greenfieldOutput?.workflowTargetsPresent === true &&
    greenfieldOutput?.testsPresent === true &&
    greenfieldOutput?.deploymentConfigPresent === true &&
    greenfieldOutput?.environmentManifestPresent === true &&
    greenfieldOutput?.readmeRunbookPresent === true &&
    greenfieldOutput?.launchPacketPresent === true &&
    greenfieldOutput?.noPlaceholderScanPresent === true;

  const emittedOutputDir = String(greenfieldOutput?.emittedOutputDir || "");
  const claimsEmittedOutput = greenfieldOutput?.emittedFileTreeProof === true;
  const emittedProofValidation = claimsEmittedOutput
    ? validateEmittedOutput(emittedOutputDir)
    : { ok: true, issues: [] as string[] };

  const greenfieldProofOk =
    greenfieldProof?.pathId === "greenfield_app_build" &&
    greenfieldProof?.proofGrade === "local_runtime" &&
    greenfieldProof?.status === "passed" &&
    greenfieldRoutes.some((r: any) => r?.path === "/api/projects/intake" && r?.ok === true) &&
    greenfieldRoutes.some((r: any) => String(r?.path || "").includes("/spec/analyze") && r?.ok === true) &&
    greenfieldRoutes.some((r: any) => String(r?.path || "").includes("/spec/build-contract") && r?.ok === true) &&
    greenfieldRoutes.some((r: any) => String(r?.path || "").includes("/compile") && r?.ok === true) &&
    greenfieldRoutes.some((r: any) => String(r?.path || "").includes("/plan") && r?.ok === true) &&
    greenfieldValidators.some((v: any) => v?.name === "generated_app_validator" && v?.status === "passed") &&
    greenfieldValidators.some((v: any) => v?.name === "no_placeholder_validator" && v?.status === "passed") &&
    greenfieldOutput?.planPacketTargetProof === true &&
    greenfieldOutput?.noPlaceholderScanPassed === true &&
    greenfieldOutput?.generatedAppValidatorsPassed === true &&
    greenfieldGeneratedArtifactDepth &&
    emittedProofValidation.ok &&
    greenfieldProducedArtifacts.includes("launchPacket") &&
    greenfieldProducedArtifacts.includes("generatedArtifactManifest") &&
    hasGreenfieldValidatorPass &&
    Number(greenfieldProof?.summary?.failedSteps || 0) === 0;

  const ok =
    registry.includes("blueprintRegistry") &&
    benchmarkThreshold >= 8.5 &&
    benchmarkCaseCount >= 25 &&
    greenfieldProofOk &&
    domainDepthOk &&
    rubric.includes("domain coverage set") &&
    rubric.includes("launch closure rule") &&
    server.includes("/spec/build-contract") &&
    server.includes("/spec/approve") &&
    server.includes("Build contract is not approved and ready") &&
    !readme.includes("guided mode") &&
    !readme.includes("fast mode") &&
    !readme.includes("autopilot mode") &&
    launchTruthAligned &&
    (blockers.includes("open") || blockers.includes("in progress") || blockers.includes("closed"));

  return result(
    ok,
    ok
      ? "Universal builder readiness scaffolding and gates are present with benchmark coverage and chat-first constraints."
      : "Universal builder readiness is incomplete (benchmark, gating, or documentation alignment failed).",
    checks
  );
}
