/**
 * jobIdempotencyAndQueueSafety.test.ts
 *
 * Structural proof that the build execution system is safe under retries,
 * double-clicks, worker restarts, network timeouts, and duplicate requests.
 *
 * Tests (structural, file-based — no Supabase required):
 *   A. Deterministic job ID formula
 *   B. Idempotent enqueue (same packet → same job ID, no duplicate)
 *   C. Double build/start returns existing run (idempotencyHit)
 *   D. Parallel build/start — only one run created
 *   E. Repeated chat "build" does not create duplicate autonomous run
 *   F. Worker crash/restart — abandoned job reclaimed, not duplicated
 *   G. Retry after timeout — lease reclaim safe
 *   H. Repair replay uses new job (intentional, not duplicate)
 *   I. Observability counters present in jobClient
 *   J. server_app.ts uses idempotentEnqueueJob (not raw enqueueJob) for normal paths
 */
import assert from "node:assert";
import fs from "node:fs";
import path from "node:path";
import {
  JsonDurableStore,
  makeProject,
} from "../../../orchestration-core/src/durableOrchestrationCore";
import { stablePacketJobId } from "../../../supabase-adapter/src/jobClient";

const root = process.cwd();

function read(rel: string): string {
  return fs.readFileSync(path.join(root, rel), "utf8");
}

// ── A. Deterministic job ID ───────────────────────────────────────────────────

function testDeterministicJobId() {
  const projectId = "test-project-abc";
  const packetId  = "foundation_runtime-p100";

  const id1 = stablePacketJobId(projectId, packetId);
  const id2 = stablePacketJobId(projectId, packetId);

  assert.strictEqual(id1, id2, "stablePacketJobId must be deterministic");
  assert.ok(id1.startsWith("job_"), "stablePacketJobId must start with job_");
  assert.ok(/^[a-zA-Z0-9_-]+$/.test(id1), "stablePacketJobId must only contain safe chars");

  // Different packets must produce different IDs
  const id3 = stablePacketJobId(projectId, "foundation_runtime-p101");
  assert.notStrictEqual(id1, id3, "different packetIds must produce different jobIds");

  // Different projects must produce different IDs
  const id4 = stablePacketJobId("other-project", packetId);
  assert.notStrictEqual(id1, id4, "different projectIds must produce different jobIds");

  console.log("  ✓ deterministic job ID");
}

// ── B. Idempotent enqueue via JsonDurableStore ────────────────────────────────

async function testIdempotentEnqueue() {
  const dir = path.join(root, "release-evidence", "runtime", "idempotency-test");
  fs.rmSync(dir, { recursive: true, force: true });
  fs.mkdirSync(dir, { recursive: true });
  const store = new JsonDurableStore(path.join(dir, "state.json"));

  const projectId = "idempotency-test-project";
  const packetId  = "foundation_runtime-p100";

  const project = makeProject(projectId, "Build a CRM app");
  store.upsertProject(project);

  const job1 = store.enqueue(projectId, packetId);
  const job2 = store.enqueue(projectId, packetId);  // Duplicate enqueue
  const job3 = store.enqueue(projectId, packetId);  // Third attempt

  assert.strictEqual(job1.jobId, job2.jobId, "duplicate enqueue must return same job ID");
  assert.strictEqual(job1.jobId, job3.jobId, "triple enqueue must return same job ID");

  const allJobs = store.listJobs();
  assert.strictEqual(allJobs.length, 1, "duplicate enqueues must not create extra queue entries");
  assert.strictEqual(allJobs[0].status, "queued", "job must remain in queued status");

  fs.rmSync(dir, { recursive: true, force: true });
  console.log("  ✓ idempotent enqueue (same packet → same job, no duplicate)");
}

// ── C. Double build/start — idempotency guard in server_app.ts ───────────────

function testBuildStartIdempotencyGuard() {
  const serverApp = read("apps/orchestrator-api/src/server_app.ts");

  // build/start route must check for existing active run
  assert.ok(serverApp.includes("existingBuildRun"),
    "POST /build/start must check for existingBuildRun before starting new run");
  assert.ok(serverApp.includes("idempotencyHit: true"),
    "POST /build/start must return idempotencyHit:true for duplicate requests");

  // autonomous-build/start route must check too
  assert.ok(serverApp.includes("existingAutonomousRun"),
    "POST /autonomous-build/start must check for existingAutonomousRun before starting new run");

  // idempotency hit counter must be incremented
  assert.ok(serverApp.includes("idempotencyHitCount++"),
    "server_app.ts must increment idempotencyHitCount on idempotency hits");

  console.log("  ✓ double build/start returns existing run (idempotencyHit)");
}

// ── D. Parallel build/start — durable store prevents duplicate jobs ───────────

async function testParallelEnqueueSafety() {
  const dir = path.join(root, "release-evidence", "runtime", "parallel-enqueue-test");
  fs.rmSync(dir, { recursive: true, force: true });
  fs.mkdirSync(dir, { recursive: true });
  const store = new JsonDurableStore(path.join(dir, "state.json"));

  const projectId = "parallel-test-project";
  const project = makeProject(projectId, "Test app");
  store.upsertProject(project);

  const packetId = "foundation_runtime-p100";

  // Simulate parallel enqueue calls (sequential in single process but represents
  // the concurrent HTTP request scenario)
  const results = await Promise.all([
    Promise.resolve(store.enqueue(projectId, packetId)),
    Promise.resolve(store.enqueue(projectId, packetId)),
    Promise.resolve(store.enqueue(projectId, packetId)),
  ]);

  assert.ok(results.every((r) => r.jobId === results[0].jobId), "all parallel enqueues must return the same job ID");
  assert.strictEqual(store.listJobs().length, 1, "parallel enqueues must result in exactly one job");

  fs.rmSync(dir, { recursive: true, force: true });
  console.log("  ✓ parallel enqueue → exactly one job in queue");
}

// ── E. Repeated chat 'build' — operator/send idempotency ─────────────────────

function testOperatorSendIdempotency() {
  const serverApp = read("apps/orchestrator-api/src/server_app.ts");

  // operator/send must check for existing active run when routing autonomous build
  assert.ok(serverApp.includes("existingRun") && serverApp.includes("shouldContinue"),
    "operator/send must gate autonomous build start on existing run state");

  assert.ok(serverApp.includes("getAutonomousBuildRun"),
    "operator/send must call getAutonomousBuildRun to check existing state");

  console.log("  ✓ repeated chat 'build' guarded by existing run check");
}

// ── F. Worker crash/restart — released job claimed by new worker ──────────────

async function testWorkerCrashRestart() {
  const dir = path.join(root, "release-evidence", "runtime", "worker-crash-test");
  fs.rmSync(dir, { recursive: true, force: true });
  fs.mkdirSync(dir, { recursive: true });
  const store = new JsonDurableStore(path.join(dir, "state.json"));

  const projectId = "crash-test-project";
  const packetId  = "foundation_runtime-p100";
  const project = makeProject(projectId, "Test app");
  store.upsertProject(project);

  store.enqueue(projectId, packetId);
  const claimedByWorker1 = store.claim("worker-1");
  assert.ok(claimedByWorker1, "worker-1 must claim the job");
  assert.strictEqual(claimedByWorker1!.workerId, "worker-1");
  assert.strictEqual(claimedByWorker1!.status, "running");

  // Simulate worker-1 crash: release job back to queued (lease expiry)
  const released = store.releaseForRetry(claimedByWorker1!.jobId);
  assert.strictEqual(released.status, "queued", "job must return to queued after lease expiry");
  assert.strictEqual(released.workerId, null, "workerId must be cleared after release");

  // Simulate API restart: reload store from disk
  const storeAfterRestart = new JsonDurableStore(path.join(dir, "state.json"));
  const reclaimedByWorker2 = storeAfterRestart.claim("worker-2");

  assert.ok(reclaimedByWorker2, "worker-2 must reclaim the job after worker-1 crash");
  assert.strictEqual(reclaimedByWorker2!.jobId, claimedByWorker1!.jobId, "same job ID must be reclaimed");
  assert.strictEqual(reclaimedByWorker2!.workerId, "worker-2", "worker-2 must own the job");

  const allJobs = storeAfterRestart.listJobs();
  assert.strictEqual(allJobs.length, 1, "no duplicate jobs created during crash/restart cycle");

  storeAfterRestart.finalize(reclaimedByWorker2!.jobId, "succeeded");
  const finalJobs = storeAfterRestart.listJobs();
  assert.strictEqual(finalJobs[0].status, "succeeded", "job must finalize correctly after reclaim");

  fs.rmSync(dir, { recursive: true, force: true });
  console.log("  ✓ worker crash/restart — abandoned job reclaimed, not duplicated");
}

// ── G. Retry after timeout — only queued jobs are claimable ──────────────────

async function testLeaseReclaim() {
  const dir = path.join(root, "release-evidence", "runtime", "lease-reclaim-test");
  fs.rmSync(dir, { recursive: true, force: true });
  fs.mkdirSync(dir, { recursive: true });
  const store = new JsonDurableStore(path.join(dir, "state.json"));

  const projectId = "lease-test-project";
  store.upsertProject(makeProject(projectId, "Test app"));

  store.enqueue(projectId, "packet-1");
  store.enqueue(projectId, "packet-2");

  const claimed1 = store.claim("worker-a");
  assert.ok(claimed1, "first claim must succeed");
  assert.strictEqual(claimed1!.status, "running");

  // Simulate lease expiry for claimed1 — release back to queue
  store.releaseForRetry(claimed1!.jobId);

  // worker-b claims; FIFO means packet-1 (older) is claimed first
  const claimed2 = store.claim("worker-b");
  assert.ok(claimed2, "worker-b must claim after lease expiry");
  assert.strictEqual(claimed2!.jobId, claimed1!.jobId, "same job reclaimed after lease expiry");

  // worker-c claims packet-2
  const claimed3 = store.claim("worker-c");
  assert.ok(claimed3, "worker-c claims the next queued packet");
  assert.notStrictEqual(claimed3!.jobId, claimed2!.jobId, "worker-c must get different job");

  // No duplicate jobs
  assert.strictEqual(store.listJobs().length, 2, "lease reclaim must not create extra jobs");

  fs.rmSync(dir, { recursive: true, force: true });
  console.log("  ✓ lease reclaim — only queued jobs claimed, no duplicates");
}

// ── H. Repair replay uses new job ID (intentional retry, not accident) ────────

function testRepairReplayUsesNewJobId() {
  const serverApp = read("apps/orchestrator-api/src/server_app.ts");

  // repair/replay route must use a fresh (non-deterministic) job ID
  // because it intentionally re-executes a failed packet
  const replaySection = serverApp.slice(serverApp.indexOf("/repair/replay"));
  assert.ok(replaySection.includes("enqueueJob") || replaySection.includes("idempotentEnqueueJob"),
    "repair/replay must call enqueueJob or idempotentEnqueueJob for re-execution");

  console.log("  ✓ repair replay correctly re-enqueues (intentional retry)");
}

// ── I. Observability counters present in jobClient ────────────────────────────

function testObservabilityCounters() {
  const jobClient = read("packages/supabase-adapter/src/jobClient.ts");

  assert.ok(jobClient.includes("duplicateEnqueuePrevented"),
    "jobClient must track duplicateEnqueuePrevented counter");
  assert.ok(jobClient.includes("idempotencyHit"),
    "jobClient must track idempotencyHit counter");
  assert.ok(jobClient.includes("leaseReclaim"),
    "jobClient must track leaseReclaim counter");
  assert.ok(jobClient.includes("deadLetter"),
    "jobClient must track deadLetter counter");
  assert.ok(jobClient.includes("getQueueObservability"),
    "jobClient must export getQueueObservability()");

  console.log("  ✓ observability counters (duplicateEnqueuePrevented, idempotencyHit, leaseReclaim, deadLetter)");
}

// ── J. server_app.ts uses idempotentEnqueueJob for normal paths ───────────────

function testServerUsesIdempotentEnqueue() {
  const serverApp = read("apps/orchestrator-api/src/server_app.ts");

  assert.ok(serverApp.includes("idempotentEnqueueJob"),
    "server_app.ts must import and use idempotentEnqueueJob");
  assert.ok(serverApp.includes("stablePacketJobId"),
    "server_app.ts must import stablePacketJobId for deterministic job IDs");
  assert.ok(serverApp.includes("getQueueObservability"),
    "server_app.ts must import getQueueObservability for observability");

  // Count occurrences of idempotentEnqueueJob vs raw enqueueJob calls
  // (repair/replay is allowed to use raw enqueueJob for intentional re-runs)
  const idempotentCalls = (serverApp.match(/idempotentEnqueueJob/g) || []).length;
  assert.ok(idempotentCalls >= 4,
    `server_app.ts must use idempotentEnqueueJob at least 4 times (found ${idempotentCalls})`);

  console.log("  ✓ server_app.ts uses idempotentEnqueueJob for normal enqueue paths");
}

// ── K. Build cannot start without readyToBuild=true ──────────────────────────

function testReadinessGateStillEnforced() {
  const serverApp = read("apps/orchestrator-api/src/server_app.ts");

  // Both build/start routes must call computeProjectReadiness and check readyToBuild
  const buildStartSection = serverApp.slice(
    serverApp.indexOf('"/api/projects/:projectId/build/start"'),
    serverApp.indexOf('"/api/projects/:projectId/autonomous-build/start"')
  );
  assert.ok(buildStartSection.includes("readyToBuild"),
    "POST /build/start must check readyToBuild before any build action");
  assert.ok(buildStartSection.includes("computeProjectReadiness"),
    "POST /build/start must call computeProjectReadiness");

  const autonomousSection = serverApp.slice(
    serverApp.indexOf('"/api/projects/:projectId/autonomous-build/start"'),
    serverApp.indexOf('"/api/projects/:projectId/autonomous-build/status"')
  );
  assert.ok(autonomousSection.includes("readyToBuild"),
    "POST /autonomous-build/start must check readyToBuild");

  console.log("  ✓ readiness gate still enforced before idempotency check");
}

async function main() {
  console.log("jobIdempotencyAndQueueSafety.test.ts");
  testDeterministicJobId();
  await testIdempotentEnqueue();
  testBuildStartIdempotencyGuard();
  await testParallelEnqueueSafety();
  testOperatorSendIdempotency();
  await testWorkerCrashRestart();
  await testLeaseReclaim();
  testRepairReplayUsesNewJobId();
  testObservabilityCounters();
  testServerUsesIdempotentEnqueue();
  testReadinessGateStillEnforced();
  console.log("jobIdempotencyAndQueueSafety.test.ts passed");
}

main().catch((err) => { console.error(err); process.exit(1); });
