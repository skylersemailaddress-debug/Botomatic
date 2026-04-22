const URL = process.env.SUPABASE_URL!;
const KEY = process.env.SUPABASE_SERVICE_ROLE_KEY!;

const headers = {
  apikey: KEY,
  Authorization: `Bearer ${KEY}`,
  "Content-Type": "application/json",
};

export async function enqueueJob(job: {
  job_id: string;
  project_id: string;
  packet_id: string;
}) {
  await fetch(`${URL}/rest/v1/orchestrator_jobs`, {
    method: "POST",
    headers,
    body: JSON.stringify({
      ...job,
      type: "execute_packet",
      status: "queued",
    }),
  });
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

  const data = await res.json();
  return data?.[0] || null;
}

export async function finalizeJob(
  jobId: string,
  status: string,
  error?: string
) {
  await fetch(`${URL}/rest/v1/orchestrator_jobs?job_id=eq.${jobId}`, {
    method: "PATCH",
    headers,
    body: JSON.stringify({
      status,
      last_error: error || null,
      lease_expires_at: null,
      updated_at: new Date().toISOString(),
    }),
  });
}
