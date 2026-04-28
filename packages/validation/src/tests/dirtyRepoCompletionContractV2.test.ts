import assert from "assert";
import {
  addDirtyRepoEvidenceEntry,
  createDirtyRepoEvidenceSnapshot,
  deriveDirtyRepoCompletionBlockers,
} from "../../../repo-intake/src/dirtyRepoEvidence";
import {
  buildDirtyRepoCompletionContractV2,
  runCompletionContract,
  validateDirtyRepoCompletionContractV2,
} from "../../../repo-completion/src";

function buildSnapshot() {
  let snapshot = createDirtyRepoEvidenceSnapshot({ entries: [] });
  snapshot = addDirtyRepoEvidenceEntry(snapshot, {
    id: "e_security",
    source: "risk_security",
    severity: "critical",
    category: "security",
    message: "Secret leak found",
  });
  snapshot = addDirtyRepoEvidenceEntry(snapshot, {
    id: "e_integration",
    source: "risk_fake_integration",
    severity: "high",
    category: "integration",
    message: "Integration boundary unknown",
  });
  return snapshot;
}

function run() {
  const snapshot = buildSnapshot();
  const blockers = deriveDirtyRepoCompletionBlockers(snapshot);

  const contract = buildDirtyRepoCompletionContractV2({
    detectedProduct: "api_service",
    detectedStack: ["node"],
    evidenceSnapshot: snapshot,
    completionBlockers: blockers,
  });
  assert.ok(contract.evidenceSnapshot.snapshotId);
  assert.ok(contract.blockers.every((b) => b.evidenceEntryIds.length > 0));

  const bad = { ...contract, blockers: [{ ...contract.blockers[0], evidenceEntryIds: [] }] };
  assert.ok(validateDirtyRepoCompletionContractV2(bad).some((e) => e.includes("missing evidenceEntryIds")));

  const failedProof = buildDirtyRepoCompletionContractV2({
    detectedProduct: "api_service",
    detectedStack: ["node"],
    evidenceSnapshot: snapshot,
    completionBlockers: blockers,
    criticalValidatorFailures: ["Validate-Critical"],
  });
  assert.notStrictEqual(failedProof.proofConsistency.status, "passed");

  const noEvidence = buildDirtyRepoCompletionContractV2({
    detectedProduct: "api_service",
    detectedStack: ["node"],
    evidenceSnapshot: createDirtyRepoEvidenceSnapshot({ entries: [] }),
    completionBlockers: [],
  });
  assert.strictEqual(noEvidence.status, "blocked");

  const clean = buildDirtyRepoCompletionContractV2({
    detectedProduct: "api_service",
    detectedStack: ["node"],
    evidenceSnapshot: snapshot,
    completionBlockers: [],
  });
  assert.ok(["candidate_ready", "validation_ready"].includes(clean.status));
  assert.ok(!["launch_ready", "production_ready"].includes(clean.status as string));

  const legacy = runCompletionContract({
    detectedProduct: "api_service",
    detectedStack: ["node"],
    blockers: ["Security gap"],
    evidenceSnapshot: snapshot,
    completionBlockers: blockers,
  });
  assert.ok(Array.isArray(legacy.commercialLaunchBlockers));
  assert.ok(Array.isArray(legacy.recommendedCompletionPlan));
  assert.ok(legacy.completionContractV2);

  assert.ok(snapshot.capturedAt);

  console.log("dirtyRepoCompletionContractV2.test.ts passed");
}

run();
