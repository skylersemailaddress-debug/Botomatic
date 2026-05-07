const URL = process.env.SUPABASE_URL!;
const KEY = process.env.SUPABASE_SERVICE_ROLE_KEY!;

const headers = {
  apikey: KEY,
  Authorization: `Bearer ${KEY}`,
  "Content-Type": "application/json",
};

// ── Observability counters (module-level, per process lifetime) ───────────────

const _obs = {
  duplicateEnqueuePrevented: 0,
  idempotencyHit: 0,
  leaseReclaim: 0,
  deadLetter: 0,
};

export function getQueueObservability() {
  return { ..._obs };
}

export function recordLeaseReclaim() {
  _obs.leaseReclaim++;
}

export function recordDeadLetter() {
  _obs.deadLetter++;
}

// ── In-process enqueue deduplication set ─────────────────────────────────────
// Tracks (project_id:packet_id) pairs enqueued in this process lifetime.
// Prevents same process from issuing duplicate Supabase INSERTs for the same
// packet even if called from concurrent code paths.

const _enqueuedPacketKeys = new Set<string>();

function packetKey(projectId: string, packetId: string): string {
  return `${projectId}:${packetId}`;
}

// ── Deterministic job ID ──────────────────────────────────────────────────────
// Must match the formula used by JsonDurableStore.stableJobId so that the
// same packet always maps to the same job_id regardless of which code path
// calls enqueueJob.

export function stablePacketJobId(projectId: string, packetId: string): string {
  return `job_${projectId}_${packetId}`.replace(/[^a-zA-Z0-9_-]/g, "_");
}

async function parseJsonSafe(res: Response) {
  const text = await res.text();
  if (!text) return null;
  try {
    return JSON.parse(text);
  } catch {
    return { raw: text };
  }
}

export async function enqueueJob(job: {
  job_id: string;
  project_id: string;
  packet_id: string;
  owner_user_id: string;
  tenant_id?: string;
}) {
  if (!URL) {
    // Dev/memory mode: no Supabase configured, packet stays pending in-memory
    return;
  }
  const res = await fetch(`${URL}/rest/v1/orchestrator_jobs`, {
    method: "POST",
    headers,
    body: JSON.stringify({
      ...job,
      tenant_id: job.tenant_id ?? job.owner_user_id,
      type: "execute_packet",
      status: "queued",
    }),
  });

  if (!res.ok) {
    const body = await parseJsonSafe(res);
    throw new Error(`enqueueJob failed ${res.status}: ${JSON.stringify(body)}`);
  }
}

// ── Idempotent enqueue ────────────────────────────────────────────────────────
// Prevents duplicate jobs for the same (project_id, packet_id) pair.
// Two-layer protection:
//   1. In-process Set: prevents redundant network calls within the same process
//   2. Supabase "ignore-duplicates": handles cross-process races via PK conflict

export async function idempotentEnqueueJob(job: {
  project_id: string;
  packet_id: string;
  owner_user_id: string;
  tenant_id?: string;
}): Promise<{ enqueued: boolean; jobId: string; prevented: boolean }> {
  const jobId = stablePacketJobId(job.project_id, job.packet_id);
  const key = packetKey(job.project_id, job.packet_id);

  if (_enqueuedPacketKeys.has(key)) {
    _obs.duplicateEnqueuePrevented++;
    return { enqueued: false, jobId, prevented: true };
  }

  if (!URL) {
    _enqueuedPacketKeys.add(key);
    return { enqueued: true, jobId, prevented: false };
  }

  const res = await fetch(`${URL}/rest/v1/orchestrator_jobs`, {
    method: "POST",
    headers: {
      ...headers,
      Prefer: "resolution=ignore-duplicates",
    },
    body: JSON.stringify({
      job_id: jobId,
      project_id: job.project_id,
      packet_id: job.packet_id,
      owner_user_id: job.owner_user_id,
      tenant_id: job.tenant_id ?? job.owner_user_id,
      type: "execute_packet",
      status: "queued",
    }),
  });

  if (!res.ok) {
    const body = await parseJsonSafe(res);
    throw new Error(`idempotentEnqueueJob failed ${res.status}: ${JSON.stringify(body)}`);
  }

  _enqueuedPacketKeys.add(key);
  return { enqueued: true, jobId, prevented: false };
}

export async function claimJob(workerId: string, leaseMs: number) {
  if (!URL) {
    return null;
  }
  const res = await fetch(`${URL}/rest/v1/rpc/claim_job`, {
    method: "POST",
    headers,
    body: JSON.stringify({
      worker_id: workerId,
      lease_ms: leaseMs,
    }),
  });

  const data = await parseJsonSafe(res);

  if (!res.ok) {
    throw new Error(`claimJob failed ${res.status}: ${JSON.stringify(data)}`);
  }

  return data?.[0] || null;
}

export async function finalizeJob(
  jobId: string,
  status: string,
  error?: string
) {
  if (!URL) {
    return;
  }
  const res = await fetch(`${URL}/rest/v1/orchestrator_jobs?job_id=eq.${jobId}`, {
    method: "PATCH",
    headers,
    body: JSON.stringify({
      status,
      last_error: error || null,
      lease_expires_at: null,
      updated_at: new Date().toISOString(),
    }),
  });

  if (!res.ok) {
    const body = await parseJsonSafe(res);
    throw new Error(`finalizeJob failed ${res.status}: ${JSON.stringify(body)}`);
  }
}

async function getCountForStatus(status: string): Promise<number> {
  const res = await fetch(`${URL}/rest/v1/orchestrator_jobs?status=eq.${encodeURIComponent(status)}&select=job_id`, {
    method: "GET",
    headers: {
      ...headers,
      Prefer: "count=exact",
    },
  });

  if (!res.ok) {
    const body = await parseJsonSafe(res);
    throw new Error(`getQueueStats failed ${res.status}: ${JSON.stringify(body)}`);
  }

  const contentRange = res.headers.get("content-range") || "";
  const total = Number(contentRange.split("/")[1] || 0);
  return Number.isFinite(total) ? total : 0;
}

export async function getQueueStats(): Promise<{
  queued: number;
  running: number;
  succeeded: number;
  failed: number;
  total: number;
}> {
  const [queued, running, succeeded, failed] = await Promise.all([
    getCountForStatus("queued"),
    getCountForStatus("running"),
    getCountForStatus("succeeded"),
    getCountForStatus("failed"),
  ]);

  return {
    queued,
    running,
    succeeded,
    failed,
    total: queued + running + succeeded + failed,
  };
}
