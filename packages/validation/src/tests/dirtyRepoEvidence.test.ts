import assert from "assert";
import {
  addDirtyRepoEvidenceEntry,
  createDirtyRepoEvidenceSnapshot,
  deriveDirtyRepoCompletionBlockers,
  summarizeDirtyRepoEvidence,
} from "../../../repo-intake/src";
import { runCompletionContract } from "../../../repo-completion/src";

function testSnapshotCreation() {
  const snapshot = createDirtyRepoEvidenceSnapshot({ sources: ["intake_artifact"] });
  assert(snapshot.snapshotId.startsWith("dirty_repo_evidence_"));
  assert.strictEqual(snapshot.summary.totalEntries, 0);
  assert.deepStrictEqual(snapshot.summary.bySeverity, { info: 0, warning: 0, critical: 0 });
}

function testBlockerDerivationFromEvidence() {
  let snapshot = createDirtyRepoEvidenceSnapshot();
  snapshot = addDirtyRepoEvidenceEntry(snapshot, {
    id: "e1",
    source: "validator",
    severity: "critical",
    category: "deployment",
    message: "Deployment pipeline missing",
    remediationHint: "Add release workflow.",
  });
  snapshot = addDirtyRepoEvidenceEntry(snapshot, {
    id: "e2",
    source: "audit",
    severity: "warning",
    category: "test",
    message: "No regression coverage",
  });

  const blockers = deriveDirtyRepoCompletionBlockers(snapshot);
  assert.strictEqual(blockers.length, 2);
  assert(blockers.some((b) => b.message === "Deployment pipeline missing" && b.evidenceEntryIds.includes("e1")));
}

function testNoCodeExecutionPosture() {
  const snapshot = summarizeDirtyRepoEvidence(
    createDirtyRepoEvidenceSnapshot({
      sources: ["intake_artifact", "repo_manifest", "operator_summary"],
      entries: [
        {
          id: "m1",
          source: "repo_manifest",
          severity: "info",
          category: "manifest",
          message: "Manifest extracted from uploaded metadata only",
          manifestKey: "package.json:scripts",
        },
      ],
    }),
  );
  assert.strictEqual(snapshot.entries[0].source, "repo_manifest");
  assert(snapshot.entries[0].message.toLowerCase().includes("metadata"));
}

function testBackwardCompatibleCompletionShapeWithEvidence() {
  const snapshot = createDirtyRepoEvidenceSnapshot({
    entries: [
      {
        id: "v1",
        source: "validator",
        severity: "critical",
        category: "validator",
        message: "Build failure evidence",
      },
    ],
  });
  const blockers = deriveDirtyRepoCompletionBlockers(snapshot);
  const contract = runCompletionContract({
    detectedProduct: "web_app",
    detectedStack: ["react"],
    blockers: blockers.map((b) => b.message),
    evidenceSnapshot: snapshot,
    completionBlockers: blockers,
  });

  assert(Array.isArray(contract.commercialLaunchBlockers));
  assert(Array.isArray(contract.recommendedCompletionPlan));
  assert(Array.isArray(contract.evidenceEntries));
  assert(Array.isArray(contract.completionBlockers));
  assert.strictEqual(contract.evidenceEntries?.[0]?.id, "v1");
  assert.strictEqual(contract.completionBlockers?.[0]?.evidenceEntryIds?.[0], "v1");
}

function run() {
  testSnapshotCreation();
  testBlockerDerivationFromEvidence();
  testNoCodeExecutionPosture();
  testBackwardCompatibleCompletionShapeWithEvidence();
  console.log("dirtyRepoEvidence.test.ts passed");
}

run();
