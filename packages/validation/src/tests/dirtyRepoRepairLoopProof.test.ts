import assert from "assert";
import { addDirtyRepoEvidenceEntry, createDirtyRepoEvidenceSnapshot, deriveDirtyRepoCompletionBlockers } from "../../../repo-intake/src/dirtyRepoEvidence";
import {
  buildDirtyRepoCompletionContractV2,
  buildDirtyRepoRepairLoopProof,
  runCompletionContract,
  validateDirtyRepoRepairLoopProof,
} from "../../../repo-completion/src";

function buildSnapshot() {
  let snapshot = createDirtyRepoEvidenceSnapshot({ entries: [] });
  snapshot = addDirtyRepoEvidenceEntry(snapshot, { id: "e1", source: "risk_security", severity: "critical", category: "security", message: "Secret boundary undefined" });
  snapshot = addDirtyRepoEvidenceEntry(snapshot, { id: "e2", source: "risk_fake_integration", severity: "high", category: "integration", message: "Integration boundary unknown" });
  snapshot = addDirtyRepoEvidenceEntry(snapshot, { id: "e3", source: "risk_placeholder", severity: "medium", category: "placeholder", message: "Placeholder implementation" });
  return snapshot;
}

function run() {
  const snapshot = buildSnapshot();
  const blockers = deriveDirtyRepoCompletionBlockers(snapshot);
  const completionContractV2 = buildDirtyRepoCompletionContractV2({ detectedProduct: "api_service", detectedStack: ["node"], evidenceSnapshot: snapshot, completionBlockers: blockers });

  const proof = buildDirtyRepoRepairLoopProof({ evidenceSnapshot: snapshot, completionContractV2 });
  assert.strictEqual(proof.evidenceSnapshotId, snapshot.snapshotId);
  assert.strictEqual(proof.completionContractVersion, "2.0");

  assert.ok(proof.plan.orderedActions.every((a) => a.evidenceEntryIds.length > 0));

  const securityIndex = proof.plan.orderedActions.findIndex((a) => a.actionType === "document_security_boundary");
  const integrationIndex = proof.plan.orderedActions.findIndex((a) => a.actionType === "document_integration_boundary");
  assert.ok(securityIndex >= 0 && integrationIndex >= 0 && securityIndex < integrationIndex);

  const codeExecActions = proof.plan.orderedActions.filter((a) => a.actionType === "isolate_untrusted_execution" || a.requiresUserApproval);
  assert.ok(codeExecActions.every((a) => a.blocked || a.requiresUserApproval));
  assert.ok(proof.plan.orderedActions.every((a) => a.executesUntrustedCode === false));

  const badProof = {
    ...proof,
    plan: { ...proof.plan, orderedActions: [{ ...proof.plan.orderedActions[0], evidenceEntryIds: [] }, ...proof.plan.orderedActions.slice(1)] },
  };
  assert.ok(validateDirtyRepoRepairLoopProof(badProof).some((e) => e.includes("missing evidenceEntryIds")));

  assert.notStrictEqual(proof.status, "candidate_ready");
  assert.ok(!["launch_ready", "production_ready"].includes(proof.status as string));

  const completion = runCompletionContract({
    detectedProduct: "api_service",
    detectedStack: ["node"],
    blockers: ["Security gap"],
    evidenceSnapshot: snapshot,
    completionBlockers: blockers,
  });
  assert.ok(Array.isArray(completion.commercialLaunchBlockers));
  assert.ok(Array.isArray(completion.recommendedCompletionPlan));
  assert.ok(completion.repairLoopProof);
  assert.strictEqual(completion.repairLoopProof?.safetyPosture.noUntrustedExecution, true);

  console.log("dirtyRepoRepairLoopProof.test.ts passed");
}

run();
