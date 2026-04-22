const URL = process.env.SUPABASE_URL!;
const KEY = process.env.SUPABASE_SERVICE_ROLE_KEY!;

const headers = {
  apikey: KEY,
  Authorization: `Bearer ${KEY}`,
  "Content-Type": "application/json",
};

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
