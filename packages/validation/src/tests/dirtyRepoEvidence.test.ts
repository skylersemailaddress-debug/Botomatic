import assert from "assert";
import {
  addDirtyRepoEvidenceEntry,
  createDirtyRepoEvidenceSnapshot,
  deriveDirtyRepoCompletionBlockers,
} from "../../../repo-intake/src/dirtyRepoEvidence";
import { runCompletionContract } from "../../../repo-completion/src";

function testEvidenceSnapshotCreation() {
  const snapshot = createDirtyRepoEvidenceSnapshot({ entries: [] });
  assert.ok(snapshot.snapshotId.startsWith("dre_"));
  assert.strictEqual(snapshot.summary.totalEntries, 0);
}

function testAddEntrySummaryUpdates() {
  let snapshot = createDirtyRepoEvidenceSnapshot({ entries: [] });
  snapshot = addDirtyRepoEvidenceEntry(snapshot, {
    id: "e1",
    source: "risk_security",
    severity: "critical",
    category: "security",
    message: "API token leaked",
    validatorId: "Validate-Botomatic-SecretsCredentialManagementReadiness",
  });
  assert.strictEqual(snapshot.summary.totalEntries, 1);
  assert.strictEqual(snapshot.summary.bySeverity.critical, 1);
  assert.strictEqual(snapshot.summary.byCategory.security, 1);
}

function testBlockerDerivationIncludesEvidenceIds() {
  let snapshot = createDirtyRepoEvidenceSnapshot({ entries: [] });
  snapshot = addDirtyRepoEvidenceEntry(snapshot, {
    id: "e2",
    source: "commercial_audit",
    severity: "high",
    category: "commercial",
    message: "No launch checklist",
    completionArea: "launch_readiness",
  });
  const blockers = deriveDirtyRepoCompletionBlockers(snapshot);
  assert.strictEqual(blockers.length, 1);
  assert.deepStrictEqual(blockers[0].evidenceEntryIds, ["e2"]);
}

function testNoCodeExecutionPosture() {
  const snapshot = createDirtyRepoEvidenceSnapshot({ entries: [] });
  assert.ok(snapshot.capturedAt);
}

function testBackwardCompatibleCompletionShape() {
  const snapshot = createDirtyRepoEvidenceSnapshot({ entries: [] });
  const completionBlockers = deriveDirtyRepoCompletionBlockers(snapshot);
  const contract = runCompletionContract({
    detectedProduct: "api_service",
    detectedStack: ["node"],
    blockers: ["Security gap"],
    evidenceSnapshot: snapshot,
    completionBlockers,
  });
  assert.ok(Array.isArray(contract.commercialLaunchBlockers));
  assert.ok(Array.isArray(contract.recommendedCompletionPlan));
  assert.ok(contract.evidenceSnapshot);
  assert.ok(Array.isArray(contract.completionBlockers));
  assert.deepStrictEqual(contract.evidenceEntries, contract.evidenceSnapshot.entries);
  assert.deepStrictEqual(contract.completionBlockers, completionBlockers);
}

function run() {
  testEvidenceSnapshotCreation();
  testAddEntrySummaryUpdates();
  testBlockerDerivationIncludesEvidenceIds();
  testNoCodeExecutionPosture();
  testBackwardCompatibleCompletionShape();
  console.log("dirtyRepoEvidence.test.ts passed");
}

run();
