import assert from "assert";
import { runDurableOrchestrationCoreBetaProof } from "../../../orchestration-core/src/durableOrchestrationCore";

async function main() {
  const proof = await runDurableOrchestrationCoreBetaProof();
  assert.equal(proof.status, "passed");
  assert.equal(proof.storageMode, "durable-file");

  for (const signalName of [
    "intake_created_durable_project",
    "compile_created_build_contract",
    "plan_created_packets",
    "queue_claimed_job",
    "worker_executed_job",
    "materialized_output_verified",
    "validation_evidence_persisted",
    "restart_resume_no_duplicate_or_lost_work",
  ]) {
    const signal = proof.signals[signalName];
    assert.equal(typeof signal, "object", `${signalName} should include evidence`);
    assert.equal((signal as any).passed, true, `${signalName} should pass`);
  }

  assert.equal(proof.queue.beforeRestart.length, 1, "enqueue must de-duplicate by project/packet before restart");
  assert.equal(proof.queue.afterRestart.length, proof.queue.beforeRestart.length, "restart must not lose queued work");
  assert.equal(proof.queue.afterCompletion.length, proof.queue.beforeRestart.length, "worker completion must not duplicate jobs");
  assert.equal(proof.queue.afterCompletion[0]?.status, "succeeded");
  assert.ok(proof.preview.projectPath, "preview/status payload should expose materialized project path");
  assert.ok(proof.evidence.validationRecord, "validation evidence should be persisted on the durable project");
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
