import fs from "fs";
import path from "path";

import type { RepoValidatorResult } from "../repoValidators";

function has(root: string, rel: string): boolean {
  return fs.existsSync(path.join(root, rel));
}

function read(root: string, rel: string): string {
  return fs.readFileSync(path.join(root, rel), "utf8");
}

function result(ok: boolean, summary: string, checks: string[]): RepoValidatorResult {
  return {
    name: "Validate-Botomatic-UniversalCapabilityStressReadiness",
    status: ok ? "passed" : "failed",
    summary,
    checks,
  };
}

export function validateUniversalCapabilityStressReadiness(root: string): RepoValidatorResult {
  const checks = [
    "packages/event-spine/src/index.ts",
    "packages/truth-engine/src/index.ts",
    "packages/memory-engine/src/index.ts",
    "packages/causal-world-model/src/index.ts",
    "packages/prediction-ledger/src/index.ts",
    "packages/simulation-engine/src/index.ts",
    "packages/intervention-engine/src/index.ts",
    "packages/governance-engine/src/index.ts",
    "packages/autonomy-tiers/src/index.ts",
    "packages/reflection-engine/src/index.ts",
    "packages/evolution-engine/src/index.ts",
    "packages/proof-engine/src/index.ts",
    "packages/domain-builders/src/registry.ts",
    "packages/ui-blueprint-registry/src/index.ts",
    "packages/validation/src/generatedApp/validateCommercialReadiness.ts",
    "packages/repo-completion/src/completionRunner.ts",
    "apps/orchestrator-api/src/server_app.ts",
    "release-evidence/runtime/universal_pipeline_runtime_proof.json",
  ];

  if (!checks.every((rel) => has(root, rel))) {
    return result(false, "Universal capability stress readiness files are incomplete.", checks);
  }

  const server = read(root, "apps/orchestrator-api/src/server_app.ts");
  const apiWired =
    server.includes("/api/projects/:projectId/universal/capability-pipeline") &&
    server.includes("buildUniversalCapabilityArtifacts") &&
    server.includes("extractedProductTruth") &&
    server.includes("buildContract") &&
    server.includes("buildGraph") &&
    server.includes("implementationPlan") &&
    server.includes("generatedCode") &&
    server.includes("validationProof") &&
    server.includes("launchPacket");

  const noPdfHardcode = !server.toLowerCase().includes("pdf specific") && !server.toLowerCase().includes("synthetic intelligence os pdf");

  let proof: any = null;
  try {
    proof = JSON.parse(read(root, "release-evidence/runtime/universal_pipeline_runtime_proof.json"));
  } catch {
    proof = null;
  }

  const proofRoutes = Array.isArray(proof?.routeExercised) ? proof.routeExercised : [];
  const proofBuildGraphNodes = Number(proof?.generatedPlanOrBuildGraph?.buildGraphNodeCount || 0);
  const proofPlanPackets = Number(proof?.generatedPlanOrBuildGraph?.planPacketCount || 0);
  const domainDepth = proof?.generatedPlanOrBuildGraph?.domainDepthMatrix;
  const domainDepthResults = Array.isArray(domainDepth?.results) ? domainDepth.results : [];
  const producedArtifacts = Array.isArray(proof?.producedArtifacts) ? proof.producedArtifacts : [];
  const routeCoverageOk =
    proofRoutes.some((r: any) => String(r?.path || "").includes("/api/projects/intake") && r?.ok === true) &&
    proofRoutes.some((r: any) => String(r?.path || "").includes("/universal/capability-pipeline") && r?.ok === true);

  const output = proof?.universalOutput || {};
  const hasTruthAndPlanningOutputs =
    output?.hasExtractedProductTruth === true &&
    output?.hasMissingQuestions === true &&
    output?.hasAssumptions === true &&
    output?.hasArchitectureRecommendation === true &&
    output?.hasBuildContract === true &&
    output?.hasBuildGraph === true &&
    output?.hasImplementationPlan === true &&
    output?.hasGeneratedCodeOrPacketTargets === true &&
    output?.hasValidationProof === true &&
    output?.hasLaunchPacket === true;

  const domainDetailsOk = domainDepthResults.every((d: any) =>
    typeof d?.domainId === "string" &&
    Array.isArray(d?.requiredSpecs) &&
    Array.isArray(d?.buildCommands) &&
    Array.isArray(d?.testCommands) &&
    Array.isArray(d?.validationCommands) &&
    Array.isArray(d?.launchRubric) &&
    Array.isArray(d?.noPlaceholderRules) &&
    Array.isArray(d?.repairStrategy) &&
    typeof d?.readinessStatus === "string" &&
    Boolean(d?.validatorMapped)
  );

  const proofOk =
    proof?.pathId === "universal_capability_pipeline" &&
    proof?.proofGrade === "local_runtime" &&
    proof?.status === "passed" &&
    proof?.contract?.type === "build_contract" &&
    routeCoverageOk &&
    hasTruthAndPlanningOutputs &&
    proofBuildGraphNodes >= 10 &&
    proofPlanPackets >= 10 &&
    Number(domainDepth?.totalDomains || 0) >= 19 &&
    Number(domainDepth?.failedDomains || 0) === 0 &&
    domainDepthResults.length >= 19 &&
    domainDepthResults.every((r: any) => r?.status === "passed") &&
    domainDetailsOk &&
    ["extractedProductTruth", "buildContract", "buildGraph", "implementationPlan", "generatedCode", "validationProof", "launchPacket", "reusableSubsystems"].every((name) => producedArtifacts.includes(name)) &&
    Number(proof?.summary?.failedSteps || 0) === 0;

  const ok = apiWired && noPdfHardcode && proofOk;

  return result(
    ok,
    ok
      ? "Universal capability stress pipeline is wired with reusable engines and 10-output artifact contract."
      : "Universal capability stress pipeline is incomplete or includes non-reusable hardcoding.",
    checks
  );
}
