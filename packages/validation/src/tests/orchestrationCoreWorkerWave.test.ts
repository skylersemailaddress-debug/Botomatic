import assert from "node:assert/strict";
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import {
  InMemoryOrchestrationQueue,
  assignWaveDependencies,
  completeClaimedJob,
  enqueueRunnablePackets,
  runWorkerWaveProof,
} from "../../../orchestration-core/src/memoryOrchestrationCore";

function testWaveQueueProgression() {
  const projectId = "test-project";
  let plan = assignWaveDependencies({
    milestones: [
      { id: "m1", sequence: 1 },
      { id: "m2", sequence: 2 },
    ],
    packets: [
      { packetId: "root", projectId, milestoneId: "m1", goal: "root", status: "pending" },
      { packetId: "dependent", projectId, milestoneId: "m2", goal: "dependent", status: "pending" },
    ],
  });

  assert.deepEqual(plan.packets.find((packet) => packet.packetId === "root")?.dependencies, []);
  assert.deepEqual(plan.packets.find((packet) => packet.packetId === "dependent")?.dependencies, ["root"]);

  const queue = new InMemoryOrchestrationQueue();
  plan = enqueueRunnablePackets(plan, queue);
  plan = enqueueRunnablePackets(plan, queue);
  assert.equal(queue.stats().total, 1, "enqueue must de-duplicate root jobs");
  assert.equal(queue.list()[0]?.packetId, "root");

  let result = completeClaimedJob(plan, queue, "worker-a");
  plan = enqueueRunnablePackets(result.plan, queue);
  assert.equal(result.job?.status, "succeeded");
  assert.equal(result.job?.workerId, "worker-a");
  assert.equal(queue.stats().total, 2, "dependent packet should enqueue after root completion");

  result = completeClaimedJob(plan, queue, "worker-b");
  plan = enqueueRunnablePackets(result.plan, queue);
  assert.equal(result.job?.packetId, "dependent");
  assert.equal(plan.packets.every((packet) => packet.status === "complete"), true);
}

function testProofHarness() {
  const root = mkdtempSync(join(tmpdir(), "botomatic-orchestration-proof-"));
  try {
    const proof = runWorkerWaveProof(root);
    assert.equal(proof.passed, true);
    assert.equal(proof.score, 100);
    assert.equal(proof.checks.inMemoryQueueRecords, true);
    assert.equal(proof.checks.enqueueDeduplication, true);
    assert.equal(proof.checks.workerClaiming, true);
    assert.equal(proof.checks.jobFinalization, true);
    assert.equal(proof.checks.waveDependencyAssignment, true);
    assert.equal(proof.checks.dependentPacketEnqueueing, true);
    assert.equal(proof.checks.workerMaterialization, true);
    assert.equal(proof.checks.atlasCrmWorkspace, true);
    assert.ok(proof.workspace.files.includes("src/App.tsx"));
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
}

testWaveQueueProgression();
testProofHarness();
console.log("orchestrationCoreWorkerWave.test.ts passed");
