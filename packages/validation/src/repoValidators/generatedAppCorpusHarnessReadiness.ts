import fs from "fs";
import path from "path";

import type { RepoValidatorResult } from "../repoValidators";

function has(root: string, rel: string): boolean {
  return fs.existsSync(path.join(root, rel));
}

function read(root: string, rel: string): string {
  return fs.readFileSync(path.join(root, rel), "utf8");
}

export function validateGeneratedAppCorpusHarnessReadiness(root: string): RepoValidatorResult {
  const checks = [
    "packages/validation/src/generatedApp/corpusHarness.ts",
    "packages/validation/src/generatedApp/tests/generatedAppCorpusHarness.test.ts",
    "packages/validation/src/generatedApp/tests/fixtures/generated-app-corpus/manifest.json",
    "docs/generated-app-corpus-harness.md",
    "package.json",
  ];

  if (!checks.every((rel) => has(root, rel))) {
    return {
      name: "Validate-Botomatic-GeneratedAppCorpusHarness",
      status: "failed",
      summary: "Generated app corpus harness module/tests/docs/script wiring is missing.",
      checks,
    };
  }

  const source = read(root, "packages/validation/src/generatedApp/corpusHarness.ts");
  const tests = read(root, "packages/validation/src/generatedApp/tests/generatedAppCorpusHarness.test.ts");
  const docs = read(root, "docs/generated-app-corpus-harness.md");
  const packageJson = read(root, "package.json");

  const requiredTypesPresent =
    source.includes("GeneratedAppCorpusManifest") &&
    source.includes("GeneratedAppCorpusCase") &&
    source.includes("GeneratedAppCorpusCaseResult") &&
    source.includes("GeneratedAppLaunchPacket") &&
    source.includes("GeneratedAppCorpusHarnessResult") &&
    source.includes("GeneratedAppCorpusStatus");

  const requiredApisPresent =
    source.includes("loadGeneratedAppCorpusManifest") &&
    source.includes("evaluateGeneratedAppCorpusCase") &&
    source.includes("evaluateGeneratedAppCorpus") &&
    source.includes("createGeneratedAppLaunchPacket") &&
    source.includes("validateGeneratedAppCorpusManifest");

  const boundariesPresent =
    source.includes("corpus/static") &&
    source.includes("not live deployment proof") &&
    source.includes("not runtime execution proof") &&
    source.includes("Legal/commercial validators must pass separately");

  const noDisallowedStatuses = !source.includes("launch_ready") && !source.includes("production_ready");

  const ok =
    requiredTypesPresent &&
    requiredApisPresent &&
    boundariesPresent &&
    noDisallowedStatuses &&
    tests.includes("candidate_ready") &&
    tests.includes("preview_ready") &&
    tests.includes("blocked") &&
    tests.includes("Expected readiness status mismatch") &&
    docs.includes("Test fixtures are not product proof") &&
    docs.includes("GEN-006") &&
    packageJson.includes("test:generated-app-corpus") &&
    packageJson.includes("test:universal");

  return {
    name: "Validate-Botomatic-GeneratedAppCorpusHarness",
    status: ok ? "passed" : "failed",
    summary: ok
      ? "Generated app corpus harness is present with required schema, API surface, non-claim boundaries, tests, docs, and scripts."
      : "Generated app corpus harness exists but required schema/API/boundary/tests/docs/script wiring is incomplete.",
    checks,
  };
}
