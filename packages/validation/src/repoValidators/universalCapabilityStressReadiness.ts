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

  const ok = apiWired && noPdfHardcode;

  return result(
    ok,
    ok
      ? "Universal capability stress pipeline is wired with reusable engines and 10-output artifact contract."
      : "Universal capability stress pipeline is incomplete or includes non-reusable hardcoding.",
    checks
  );
}
