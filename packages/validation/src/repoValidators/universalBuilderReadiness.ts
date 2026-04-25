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
  const server = read(root, "apps/orchestrator-api/src/server_app.ts");
  const readme = read(root, "README.md").toLowerCase();
  const blockers = read(root, "LAUNCH_BLOCKERS.md").toLowerCase();

  const benchmarkThreshold = Number(benchmarkRuntime?.thresholdTarget || 0);
  const benchmarkCaseCount = Array.isArray(benchmarkCases) ? benchmarkCases.length : 0;

  const ok =
    registry.includes("blueprintRegistry") &&
    benchmarkThreshold >= 8.5 &&
    benchmarkCaseCount >= 25 &&
    server.includes("/spec/build-contract") &&
    server.includes("/spec/approve") &&
    server.includes("Build contract is not approved and ready") &&
    !readme.includes("guided mode") &&
    !readme.includes("fast mode") &&
    !readme.includes("autopilot mode") &&
    (readme.includes("not yet") || readme.includes("not ready")) &&
    (blockers.includes("open") || blockers.includes("in progress"));

  return result(
    ok,
    ok
      ? "Universal builder readiness scaffolding and gates are present with benchmark coverage and chat-first constraints."
      : "Universal builder readiness is incomplete (benchmark, gating, or documentation alignment failed).",
    checks
  );
}
