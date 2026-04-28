import assert from "assert";
import path from "path";

import {
  createGeneratedAppLaunchPacket,
  evaluateGeneratedAppCorpus,
  evaluateGeneratedAppCorpusCase,
  loadGeneratedAppCorpusManifest,
  validateGeneratedAppCorpusManifest,
  type GeneratedAppCorpusManifest,
} from "../corpusHarness";

const fixtureRoot = path.join(__dirname, "fixtures", "generated-app-corpus");
const fixtureManifestPath = path.join(fixtureRoot, "manifest.json");

{
  const invalidManifest = {
    manifestVersion: "1",
    corpusName: "invalid",
    cases: [
      {
        id: "",
        displayName: "",
        domain: "",
        appPath: "",
        requiredChecks: [],
      },
    ],
  } as unknown as GeneratedAppCorpusManifest;

  const errors = validateGeneratedAppCorpusManifest(invalidManifest);
  assert.ok(errors.length > 0);
  assert.ok(errors.some((error) => error.includes("id is required")));
  assert.ok(errors.some((error) => error.includes("requiredChecks")));
}

const manifest = loadGeneratedAppCorpusManifest(fixtureManifestPath);
const harness = evaluateGeneratedAppCorpus(fixtureManifestPath);
assert.equal(harness.status, "passed");

{
  const cleanResult = harness.caseResults.find((result) => result.id === "clean-candidate");
  assert.ok(cleanResult);
  assert.equal(cleanResult?.readinessStatus, "candidate_ready");
}

{
  const blockedResult = harness.caseResults.find((result) => result.id === "placeholder-blocked");
  assert.ok(blockedResult);
  assert.equal(blockedResult?.readinessStatus, "blocked");
}

{
  const previewResult = harness.caseResults.find((result) => result.id === "preview-ready");
  assert.ok(previewResult);
  assert.equal(previewResult?.readinessStatus, "preview_ready");
}

{
  const packet = createGeneratedAppLaunchPacket(harness.caseResults[0]);
  assert.ok(packet.caveats.some((caveat) => caveat.toLowerCase().includes("corpus/static readiness output only")));
  assert.ok(packet.claimBoundary.toLowerCase().includes("launch-ready"));
}

{
  const mismatchCase = {
    ...manifest.cases[0],
    id: "status-mismatch",
    expectedReadinessStatus: "blocked",
  };
  const mismatchResult = evaluateGeneratedAppCorpusCase(fixtureRoot, mismatchCase);
  assert.ok(mismatchResult.findings.some((finding) => finding.includes("Expected readiness status mismatch")));
}

{
  const missingResult = evaluateGeneratedAppCorpusCase(fixtureRoot, {
    id: "missing-path",
    displayName: "Missing Path",
    domain: "internal-test",
    appPath: "does-not-exist",
    requiredChecks: ["no_placeholder_scan"],
    notes: "missing path test",
  });

  assert.equal(missingResult.readinessStatus, "blocked");
  assert.ok(missingResult.findings.some((finding) => finding.includes("does not exist")));
}

{
  const allStatuses = harness.caseResults.map((result) => result.readinessStatus);
  assert.ok(!allStatuses.includes("launch_ready" as never));
  assert.ok(!allStatuses.includes("production_ready" as never));
}

console.log("generatedAppCorpusHarness.test.ts passed");
