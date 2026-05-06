# Private Beta Architecture Decisions

Five architectural hardening decisions implemented for commercial-beta readiness.

---

## Decision 1 — Dead Letter Queue (DLQ)

**Problem:** Packet jobs that fail due to transient errors (executor timeouts, network blips, Supabase hiccups) previously stayed permanently "failed" with no retry. Repeated flaky infrastructure silently killed in-flight work.

**Solution:**
- `packages/supabase-adapter/src/jobClient.ts` — `DLQEntry` type, `sendToDLQ`, `getDLQEntries`, `retryDLQEntry`
- `packages/supabase-adapter/src/schema.sql` — `dead_letter_jobs` table with indexes on `project_id` and `retryable`
- `apps/orchestrator-api/src/server_app.ts` — per-packet retry counter (`jobAttemptMap`) with 3-attempt cap and backoff schedule (5 s → 30 s → 120 s). After attempt 3, the job is sent to the DLQ via `sendToDLQ` rather than silently discarded.
- Admin routes: `GET /api/ops/dlq` (reviewer), `POST /api/ops/dlq/:id/retry` (admin) — both guarded by `requireRole`.
- In-memory DLQ fallback (`inMemoryDLQ` Map) keeps dev mode fully functional when `SUPABASE_URL` is absent.

**Scope:** Does not block request paths — applies only to background queue worker.

---

## Decision 2 — Post-Startup Supabase Failover

**Problem:** Startup already fails fast if Supabase is unreachable, but a storage outage *during normal operation* would cause every `upsertProject` call to throw, killing the worker loop silently.

**Solution:**
- `apps/orchestrator-api/src/storageCircuitBreaker.ts` — `StorageCircuitBreaker` class with `CLOSED` / `DEGRADED` states. Opens after 3 consecutive failures; closes automatically on the next success.
- Singleton `storageCircuit` exported and imported into `server_app.ts`.
- `persistProject` wraps `upsertProject` — calls `recordSuccess(projectId, record)` on success and `recordFailure()` on any throw.
- `workerTick` checks `storageCircuit.isDegraded()` and skips processing (logs `worker_paused_storage_degraded`) to prevent data-loss storms.
- `/health` response now includes `storageHealth: { state, consecutiveFailures, degradedAt, recoveredAt, cachedProjectIds }`.

**Scope:** Does not affect read paths or API routes — only write operations and the queue worker.

---

## Decision 3 — GitHub Token Live Refresh

**Problem:** Long-lived GitHub tokens can expire or be rotated mid-deployment, causing all Git operations to fail with opaque 401 errors.

**Decision:** Documented rather than patched in code. The `getGitHub()` helper already reads `process.env.GITHUB_TOKEN` on every invocation (no module-level caching), so any sidecar or secrets manager that refreshes `GITHUB_TOKEN` in the environment will be picked up automatically. For Railway/Render/Fly deployments, set `GITHUB_TOKEN` via their secrets UI and rotate via their API — the process will pick up the new value on the next Git operation without a restart. A dedicated token-rotation endpoint is deferred until GitHub Apps OAuth is wired (post-beta).

---

## Decision 4 — Concurrent Runs State Merge

**Problem:** Two workers updating different packets inside the same project's `runs` JSONB field concurrently could cause a last-write-wins race — one worker's packet state would silently overwrite the other's.

**Solution:**
- `packages/supabase-adapter/src/schema.sql` — `merge_project_runs(p_project_id, p_expected_updated_at, p_runs)` PostgreSQL function using `SET runs = coalesce(runs, '{}') || p_runs`. The `updated_at` ETag guard ensures the merge is conditional; 0 rows returned indicates a concurrent write conflict.
- `packages/supabase-adapter/src/durableRepo.ts` — `mergeProjectRuns(projectId, expectedUpdatedAt, partialRuns)` method on `DurableProjectRepository` that calls the RPC and returns `MergeRunsResult` (`{ ok: true }` or `{ ok: false, conflict: true, message }`). Callers can re-read and retry on conflict.

**Usage:** Route handlers that need partial-runs updates (wave progression, packet completion) should call `mergeProjectRuns` instead of a full `upsertProject` when only the `runs` field changes.

---

## Decision 5 — Request Timeout Middleware

**Problem:** Long-running or stuck route handlers held Node.js worker slots indefinitely, starving the server of capacity and making runaway requests invisible in monitoring.

**Solution:**
- `makeRouteTimeout(ms)` factory in `server_app.ts` — sets a `setTimeout` that sends `408 { error: "Request timeout", timeoutMs }` if the response has not been sent within the window. Clears on `finish` / `close`.
- Three timeout tiers applied per route class:

  | Tier | Default | Applied to |
  |------|---------|-----------|
  | `SHORT_TIMEOUT`  | 10 s  | `/health`, `/api/ops/*` |
  | `MEDIUM_TIMEOUT` | 60 s  | `intake`, `spec/analyze`, `compile` |
  | `LONG_TIMEOUT`   | 300 s | `autonomous-build/start`, `dispatch/execute-next` |

- All three are configurable via `ROUTE_TIMEOUT_SHORT_MS`, `ROUTE_TIMEOUT_MEDIUM_MS`, `ROUTE_TIMEOUT_LONG_MS` env vars.
- Note: the timeout fires a 408 response but does not abort the underlying async operation (Node.js has no general cancellation primitive). Callers should treat 408 as "retry or check status" rather than "guaranteed abort".
