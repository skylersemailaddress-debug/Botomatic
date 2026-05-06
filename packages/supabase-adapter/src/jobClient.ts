const URL = process.env.SUPABASE_URL!;
const KEY = process.env.SUPABASE_SERVICE_ROLE_KEY!;

const headers = {
  apikey: KEY,
  Authorization: `Bearer ${KEY}`,
  "Content-Type": "application/json",
};

// ── Dead Letter Queue ──────────────────────────────────────────────────────────
// In-memory fallback for DLQ when Supabase is absent (memory/dev mode).
const inMemoryDLQ = new Map<string, DLQEntry>();

export type DLQEntry = {
  id: string;
  job_id: string;
  project_id: string;
  packet_id: string | null;
  attempt_count: number;
  error_message: string;
  safe_stack: string;
  retryable: boolean;
  original_payload: { packetId: string; goal?: string } | null;
  first_failed_at: string;
  last_failed_at: string;
  created_at: string;
};

export async function sendToDLQ(entry: DLQEntry): Promise<void> {
  if (!URL) {
    inMemoryDLQ.set(entry.id, entry);
    return;
  }
  const res = await fetch(`${URL}/rest/v1/dead_letter_jobs`, {
    method: "POST",
    headers: {
      ...headers,
      Prefer: "resolution=merge-duplicates",
    },
    body: JSON.stringify(entry),
  });
  if (!res.ok) {
    const body = await parseJsonSafe(res);
    // Fall back to in-memory if Supabase insert fails
    inMemoryDLQ.set(entry.id, entry);
    console.error(`sendToDLQ Supabase failed ${res.status}: ${JSON.stringify(body)} — saved to in-memory DLQ`);
  }
}

export async function getDLQEntries(limit = 100): Promise<DLQEntry[]> {
  if (!URL) {
    return Array.from(inMemoryDLQ.values()).slice(0, limit);
  }
  const res = await fetch(
    `${URL}/rest/v1/dead_letter_jobs?order=created_at.desc&limit=${limit}`,
    { method: "GET", headers: { ...headers, Accept: "application/json" } }
  );
  if (!res.ok) {
    // Fall back to in-memory
    return Array.from(inMemoryDLQ.values()).slice(0, limit);
  }
  const data = await parseJsonSafe(res);
  return Array.isArray(data) ? data : [];
}

export async function retryDLQEntry(id: string): Promise<DLQEntry | null> {
  let entry: DLQEntry | null = null;

  if (!URL) {
    entry = inMemoryDLQ.get(id) ?? null;
  } else {
    const res = await fetch(`${URL}/rest/v1/dead_letter_jobs?id=eq.${encodeURIComponent(id)}`, {
      method: "GET",
      headers: { ...headers, Accept: "application/json" },
    });
    if (res.ok) {
      const rows = await parseJsonSafe(res);
      entry = Array.isArray(rows) && rows.length > 0 ? (rows[0] as DLQEntry) : null;
    }
  }

  if (!entry) return null;

  // Re-enqueue to orchestrator_jobs
  const newJobId = `job_dlq_retry_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
  await enqueueJob({
    job_id: newJobId,
    project_id: entry.project_id,
    packet_id: entry.packet_id ?? "",
  });

  // Mark as non-retryable in DLQ so it won't get re-processed again immediately
  const updated: DLQEntry = { ...entry, retryable: false, last_failed_at: new Date().toISOString() };
  if (!URL) {
    inMemoryDLQ.set(id, updated);
  } else {
    await fetch(`${URL}/rest/v1/dead_letter_jobs?id=eq.${encodeURIComponent(id)}`, {
      method: "PATCH",
      headers,
      body: JSON.stringify({ retryable: false, last_failed_at: updated.last_failed_at }),
    });
  }

  return entry;
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
      type: "execute_packet",
      status: "queued",
    }),
  });

  if (!res.ok) {
    const body = await parseJsonSafe(res);
    throw new Error(`enqueueJob failed ${res.status}: ${JSON.stringify(body)}`);
  }
}

export async function claimJob(workerId: string, leaseMs: number) {
  if (!URL) {
    // Dev/memory mode: no Supabase configured, no jobs to claim.
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
    // Dev/memory mode: no Supabase configured, nothing to finalize.
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

async function getStaleLeaseCount(): Promise<number> {
  if (!URL) return 0;
  const res = await fetch(
    `${URL}/rest/v1/orchestrator_jobs?status=eq.running&lease_expires_at=lt.${encodeURIComponent(new Date().toISOString())}&select=job_id`,
    {
      method: "GET",
      headers: { ...headers, Prefer: "count=exact" },
    }
  );
  if (!res.ok) return 0;
  const contentRange = res.headers.get("content-range") || "";
  const total = Number(contentRange.split("/")[1] || 0);
  return Number.isFinite(total) ? total : 0;
}

export async function getQueueStats(): Promise<{
  queued: number;
  running: number;
  succeeded: number;
  failed: number;
  staleLeases: number;
  total: number;
}> {
  const [queued, running, succeeded, failed, staleLeases] = await Promise.all([
    getCountForStatus("queued"),
    getCountForStatus("running"),
    getCountForStatus("succeeded"),
    getCountForStatus("failed"),
    getStaleLeaseCount(),
  ]);

  return {
    queued,
    running,
    succeeded,
    failed,
    staleLeases,
    total: queued + running + succeeded + failed,
  };
}
