import fs from "fs";
import path from "path";

import type { RepoValidatorResult } from "../repoValidators";

function has(root: string, rel: string): boolean {
  return fs.existsSync(path.join(root, rel));
}

function read(root: string, rel: string): string {
  return fs.readFileSync(path.join(root, rel), "utf8");
}

export function validateGeneratedAppRepresentativeCorpusReadiness(root: string): RepoValidatorResult {
  const checks = [
    "fixtures/generated-app-corpus/representative/manifest.json",
    "packages/validation/src/generatedApp/tests/generatedAppRepresentativeCorpus.test.ts",
    "docs/generated-app-representative-corpus.md",
    "package.json",
  ];

  if (!checks.every((rel) => has(root, rel))) {
    return {
      name: "Validate-Botomatic-GeneratedAppRepresentativeCorpus",
      status: "failed",
      summary: "Representative generated app corpus manifest/tests/docs/script wiring is missing.",
      checks,
    };
  }

  const manifest = JSON.parse(read(root, "fixtures/generated-app-corpus/representative/manifest.json"));
  const docs = read(root, "docs/generated-app-representative-corpus.md").toLowerCase();
  const tests = read(root, "packages/validation/src/generatedApp/tests/generatedAppRepresentativeCorpus.test.ts");
  const packageJson = read(root, "package.json");

  const requiredIds = [
    "webSaasDashboard",
    "bookingApp",
    "ecommerceStore",
    "marketplace",
    "customerPortal",
    "apiService",
    "botAgentConsole",
    "mobileAppShell",
    "gameLandingPage",
    "negativePlaceholderBlocked",
  ];

  const caseIds = new Set((manifest?.cases || []).map((entry: { id: string }) => entry.id));
  const hasRequiredIds = requiredIds.every((id) => caseIds.has(id));
  const hasExpectedMix =
    (manifest?.cases || []).some((entry: { expectedReadinessStatus: string }) => entry.expectedReadinessStatus === "candidate_ready") &&
    (manifest?.cases || []).some((entry: { expectedReadinessStatus: string }) => entry.expectedReadinessStatus === "preview_ready") &&
    (manifest?.cases || []).some((entry: { expectedReadinessStatus: string; appPath: string }) =>
      entry.expectedReadinessStatus === "blocked" && String(entry.appPath || "").startsWith("negative/")
    );

  const docsBoundaryOk =
    docs.includes("not launch-ready") &&
    docs.includes("not production-ready") &&
    docs.includes("static") &&
    docs.includes("no live deployment proof") &&
    docs.includes("candidate_ready is not launch-ready");

  const testsCoverBoundary =
    tests.includes("requiredRepresentativeIds") &&
    tests.includes("negativePlaceholderBlocked") &&
    tests.includes("launch_ready") &&
    tests.includes("production_ready") &&
    tests.includes("README boundary fragment missing");

  const scriptsOk =
    packageJson.includes("test:generated-app-representative-corpus") &&
    packageJson.includes("test:universal") &&
    packageJson.includes("test:generated-app-representative-corpus");

  const ok = hasRequiredIds && hasExpectedMix && docsBoundaryOk && testsCoverBoundary && scriptsOk;

  return {
    name: "Validate-Botomatic-GeneratedAppRepresentativeCorpus",
    status: ok ? "passed" : "failed",
    summary: ok
      ? "Representative generated app corpus is present with required IDs, bounded readiness expectations, docs caveats, tests, and script wiring."
      : "Representative generated app corpus exists but required IDs/statuses/docs/tests/scripts are incomplete.",
    checks,
  };
}
