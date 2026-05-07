import assert from "assert";
import fs from "fs";
import path from "path";
import { StorageCircuitBreaker } from "../../../../apps/orchestrator-api/src/storageCircuitBreaker";
import { DurableProjectRepository, MergeRunsResult } from "../../../../packages/supabase-adapter/src/durableRepo";

const ROOT = path.resolve(__dirname, "../../../../");

function test(name: string, fn: () => void) {
  try {
    fn();
    console.log(`  ✓ ${name}`);
  } catch (err: any) {
    console.error(`  ✗ ${name}: ${err?.message || err}`);
    process.exitCode = 1;
  }
}

// ── StorageCircuitBreaker ────────────────────────────────────────────────────

console.log("StorageCircuitBreaker");

test("starts CLOSED", () => {
  const b = new StorageCircuitBreaker();
  assert.strictEqual(b.isDegraded(), false);
  assert.strictEqual(b.getHealthPayload().state, "CLOSED");
});

test("opens after 3 consecutive failures", () => {
  const b = new StorageCircuitBreaker();
  b.recordFailure();
  b.recordFailure();
  assert.strictEqual(b.isDegraded(), false, "still closed after 2");
  b.recordFailure();
  assert.strictEqual(b.isDegraded(), true, "open after 3");
  assert.strictEqual(b.getHealthPayload().state, "DEGRADED");
});

test("closes on success after degraded", () => {
  const b = new StorageCircuitBreaker();
  b.recordFailure(); b.recordFailure(); b.recordFailure();
  assert.strictEqual(b.isDegraded(), true);
  b.recordSuccess();
  assert.strictEqual(b.isDegraded(), false);
  assert.strictEqual(b.getHealthPayload().state, "CLOSED");
});

test("success resets failure counter", () => {
  const b = new StorageCircuitBreaker();
  b.recordFailure(); b.recordFailure();
  b.recordSuccess();
  b.recordFailure(); b.recordFailure();
  assert.strictEqual(b.isDegraded(), false);
});

test("caches project record on success", () => {
  const b = new StorageCircuitBreaker();
  const record = { projectId: "proj_1", name: "Test" };
  b.recordSuccess("proj_1", record);
  assert.deepStrictEqual(b.getCachedProject("proj_1"), record);
  assert.strictEqual(b.getCachedProject("proj_missing"), null);
});

test("health payload tracks degradedAt and recoveredAt timestamps", () => {
  const b = new StorageCircuitBreaker();
  assert.strictEqual(b.getHealthPayload().degradedAt, null);
  b.recordFailure(); b.recordFailure(); b.recordFailure();
  assert.ok(b.getHealthPayload().degradedAt, "degradedAt set");
  assert.strictEqual(b.getHealthPayload().recoveredAt, null);
  b.recordSuccess();
  assert.ok(b.getHealthPayload().recoveredAt, "recoveredAt set");
});

// ── MergeRunsResult type ─────────────────────────────────────────────────────

console.log("\nMergeRunsResult type");

test("success result shape is correct", () => {
  const ok: MergeRunsResult = { ok: true };
  assert.strictEqual(ok.ok, true);
});

test("conflict result shape is correct", () => {
  const conflict: MergeRunsResult = { ok: false, conflict: true, message: "Conflict detected" };
  assert.strictEqual(conflict.ok, false);
  assert.strictEqual(conflict.conflict, true);
  assert.ok(conflict.message.length > 0);
});

// ── DurableProjectRepository — mergeProjectRuns interface ───────────────────

console.log("\nDurableProjectRepository.mergeProjectRuns");

test("mergeProjectRuns method exists on class", () => {
  const repo = new DurableProjectRepository({ baseUrl: "http://localhost", serviceRoleKey: "test" });
  assert.strictEqual(typeof repo.mergeProjectRuns, "function");
});

// ── DLQ backoff constants (source-level check) ───────────────────────────────

console.log("\nDLQ integration");

test("DLQ_BACKOFF_MS schedule is [5000, 30000, 120000]", () => {
  const src = fs.readFileSync(path.join(ROOT, "apps/orchestrator-api/src/server_app.ts"), "utf8");
  assert.ok(src.includes("5_000, 30_000, 120_000"), "Backoff schedule must be [5000,30000,120000]");
  assert.ok(src.includes("MAX_JOB_ATTEMPTS = 3"), "Max attempts must be 3");
});

test("DLQ admin routes are declared", () => {
  const src = fs.readFileSync(path.join(ROOT, "apps/orchestrator-api/src/server_app.ts"), "utf8");
  assert.ok(src.includes('"/api/ops/dlq"'), "GET /api/ops/dlq route must exist");
  assert.ok(src.includes('"/api/ops/dlq/:id/retry"'), "POST /api/ops/dlq/:id/retry route must exist");
});

// ── Timeout middleware ────────────────────────────────────────────────────────

console.log("\nTimeout middleware");

test("makeRouteTimeout factory and tiers are defined", () => {
  const src = fs.readFileSync(path.join(ROOT, "apps/orchestrator-api/src/server_app.ts"), "utf8");
  assert.ok(src.includes("makeRouteTimeout"), "makeRouteTimeout factory must exist");
  assert.ok(src.includes("SHORT_TIMEOUT"), "SHORT_TIMEOUT must be defined");
  assert.ok(src.includes("MEDIUM_TIMEOUT"), "MEDIUM_TIMEOUT must be defined");
  assert.ok(src.includes("LONG_TIMEOUT"), "LONG_TIMEOUT must be defined");
});

test("health route uses SHORT_TIMEOUT", () => {
  const src = fs.readFileSync(path.join(ROOT, "apps/orchestrator-api/src/server_app.ts"), "utf8");
  assert.ok(src.includes("SHORT_TIMEOUT, respondHealth"), "Health route must use SHORT_TIMEOUT");
});

// ── Schema RPCs ───────────────────────────────────────────────────────────────

console.log("\nSchema: merge_project_runs RPC and dead_letter_jobs");

test("merge_project_runs function is in schema.sql", () => {
  const schema = fs.readFileSync(path.join(ROOT, "packages/supabase-adapter/src/schema.sql"), "utf8");
  assert.ok(schema.includes("merge_project_runs"), "schema.sql must define merge_project_runs");
  assert.ok(schema.includes("|| p_runs"), "Must use JSONB || merge operator");
  assert.ok(schema.includes("p_expected_updated_at"), "Must have ETag guard");
});

test("dead_letter_jobs table is in schema.sql", () => {
  const schema = fs.readFileSync(path.join(ROOT, "packages/supabase-adapter/src/schema.sql"), "utf8");
  assert.ok(schema.includes("dead_letter_jobs"), "schema.sql must define dead_letter_jobs");
  assert.ok(schema.includes("retryable"), "dead_letter_jobs must have retryable column");
});

console.log("\nAll private-beta hardening tests complete.");
