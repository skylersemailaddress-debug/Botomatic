// QUEUE_BACKEND controls where jobs are stored.
// "memory"   — in-process queue (default; works even when SUPABASE_URL is set)
// "supabase" — Supabase orchestrator_jobs table + claim_job RPC
//
// Project persistence (SUPABASE_URL) and job queue backend are independent.
// Use memory queue for local dev; switch to supabase for multi-worker production.

const QUEUE_BACKEND = process.env.QUEUE_BACKEND ?? "memory";
const useSupabase = QUEUE_BACKEND === "supabase";

const SUPA_URL = process.env.SUPABASE_URL ?? "";
const KEY = process.env.SUPABASE_SERVICE_ROLE_KEY ?? "";

const headers = {
  apikey: KEY,
  Authorization: `Bearer ${KEY}`,
  "Content-Type": "application/json",
};

// ── In-memory queue (used when QUEUE_BACKEND=memory) ─────────────────────────
type MemJob = {
  job_id: string;
  project_id: string;
  packet_id: string;
  status: "queued" | "running" | "succeeded" | "failed";
  worker_id: string | null;
  lease_expires_at: number | null;
  last_error: string | null;
};

const memQueue = new Map<string, MemJob>();

async function parseJsonSafe(res: Response) {
  const text = await res.text();
  if (!text) return null;
  try { return JSON.parse(text); } catch { return { raw: text }; }
}

// ── Public API ────────────────────────────────────────────────────────────────

export async function enqueueJob(job: {
  job_id: string;
  project_id: string;
  packet_id: string;
}) {
  if (!useSupabase) {
    memQueue.set(job.job_id, { ...job, status: "queued", worker_id: null, lease_expires_at: null, last_error: null });
    return;
  }

  const res = await fetch(`${SUPA_URL}/rest/v1/orchestrator_jobs`, {
    method: "POST",
    headers,
    body: JSON.stringify({ ...job, type: "execute_packet", status: "queued" }),
  });
  if (!res.ok) {
    const body = await parseJsonSafe(res);
    throw new Error(`enqueueJob failed ${res.status}: ${JSON.stringify(body)}`);
  }
}

export async function claimJob(workerId: string, leaseMs: number): Promise<MemJob | null> {
  if (!useSupabase) {
    const now = Date.now();
    for (const job of memQueue.values()) {
      if (job.status === "queued" || (job.status === "running" && job.lease_expires_at !== null && job.lease_expires_at < now)) {
        job.status = "running";
        job.worker_id = workerId;
        job.lease_expires_at = now + leaseMs;
        return { ...job };
      }
    }
    return null;
  }

  const res = await fetch(`${SUPA_URL}/rest/v1/rpc/claim_job`, {
    method: "POST",
    headers,
    body: JSON.stringify({ worker_id: workerId, lease_ms: leaseMs }),
  });
  const data = await parseJsonSafe(res);
  if (!res.ok) throw new Error(`claimJob failed ${res.status}: ${JSON.stringify(data)}`);
  return data?.[0] || null;
}

export async function finalizeJob(jobId: string, status: string, error?: string) {
  if (!useSupabase) {
    const job = memQueue.get(jobId);
    if (job) {
      job.status = status as MemJob["status"];
      job.last_error = error ?? null;
      job.lease_expires_at = null;
    }
    return;
  }

  const res = await fetch(`${SUPA_URL}/rest/v1/orchestrator_jobs?job_id=eq.${jobId}`, {
    method: "PATCH",
    headers,
    body: JSON.stringify({ status, last_error: error || null, lease_expires_at: null, updated_at: new Date().toISOString() }),
  });
  if (!res.ok) {
    const body = await parseJsonSafe(res);
    throw new Error(`finalizeJob failed ${res.status}: ${JSON.stringify(body)}`);
  }
}

export async function getQueueStats() {
  if (!useSupabase) {
    const jobs = Array.from(memQueue.values());
    const count = (s: string) => jobs.filter(j => j.status === s).length;
    return { queued: count("queued"), running: count("running"), succeeded: count("succeeded"), failed: count("failed"), total: jobs.length };
  }

  async function getCountForStatus(status: string): Promise<number> {
    const res = await fetch(`${SUPA_URL}/rest/v1/orchestrator_jobs?status=eq.${encodeURIComponent(status)}&select=job_id`, {
      method: "GET",
      headers: { ...headers, Prefer: "count=exact" },
    });
    if (!res.ok) return 0;
    const total = Number((res.headers.get("content-range") || "").split("/")[1] || 0);
    return Number.isFinite(total) ? total : 0;
  }

  const [queued, running, succeeded, failed] = await Promise.all([
    getCountForStatus("queued"), getCountForStatus("running"),
    getCountForStatus("succeeded"), getCountForStatus("failed"),
  ]);
  return { queued, running, succeeded, failed, total: queued + running + succeeded + failed };
}
