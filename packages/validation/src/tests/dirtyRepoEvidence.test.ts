import assert from "assert";
import { runCompletionContract } from "../../../repo-completion/src/completionRunner";

function testEvidenceSnapshotShape() {
  const contract = runCompletionContract({
    detectedProduct: "web_saas_app",
    detectedStack: ["react", "typescript"],
    blockers: ["Build unstable", "Missing tests"],
  });

  assert.ok(contract.evidenceSnapshot);
  assert.ok(Array.isArray(contract.evidenceEntries));
  assert.ok(Array.isArray(contract.completionBlockers));
  assert.strictEqual(contract.completionBlockers.length, 2);
  assert.strictEqual(contract.completionBlockers[0], "Build unstable");
}

function testLegacyFieldsPreserved() {
  const contract = runCompletionContract({
    detectedProduct: "api_service",
    detectedStack: ["node"],
    blockers: ["Security gap"],
  });

  assert.strictEqual(contract.detectedProduct, "api_service");
  assert.ok(Array.isArray(contract.commercialLaunchBlockers));
  assert.ok(Array.isArray(contract.recommendedCompletionPlan));
}

function run() {
  testEvidenceSnapshotShape();
  testLegacyFieldsPreserved();
  console.log("dirtyRepoEvidence.test.ts passed");
}

run();
