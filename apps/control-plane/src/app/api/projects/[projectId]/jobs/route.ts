import { NextRequest, NextResponse } from "next/server";
import { ALLOWLISTED_JOB_TYPES, appendRunLogs, executeAllowlistedJob, routeStatusFromJobs } from "@/server/executionRunner";
import { appendLog, createRun, loadProjectState, saveProjectState, sanitizeProjectId } from "@/server/executionStore";

export const dynamic = "force-dynamic";

export async function POST(request: NextRequest, { params }: { params: { projectId: string } }) {
  const projectId = sanitizeProjectId(params.projectId);
  const body = await request.json().catch(() => ({}));
  const idempotencyKey = typeof body?.idempotencyKey === "string" ? body.idempotencyKey : "";
  const jobType = typeof body?.jobType === "string" ? body.jobType : "";
  if (!idempotencyKey) return NextResponse.json({ error: { code: "bad_request", message: "idempotencyKey is required", retryable: false, details: {} } }, { status: 400 });

  const state = loadProjectState(projectId);
  const idemKey = `jobs:${projectId}:${idempotencyKey}`;
  const previous = state.idempotency[idemKey];
  if (previous?.jobId) {
    const run = state.runs.find((item) => item.runId === previous.runId);
    const existing = run?.jobs.find((item) => item.id === previous.jobId);
    if (existing) return NextResponse.json(existing);
  }

  if (!ALLOWLISTED_JOB_TYPES.includes(jobType as any)) {
    return NextResponse.json({ error: { code: "blocked_job_type", message: `Job type ${jobType || "unknown"} is not allowlisted`, retryable: false, details: { allowlistedJobTypes: ALLOWLISTED_JOB_TYPES } } }, { status: 409 });
  }

  let run = typeof body?.runId === "string" ? state.runs.find((item) => item.runId === body.runId) : undefined;
  if (!run) {
    run = createRun(projectId, `implicit_${idempotencyKey}`);
    state.runs.push(run);
  }
  run.status = "running";
  run.logs = appendLog(run.logs, `job request accepted type=${jobType}`);

  const job = await executeAllowlistedJob({ id: `job_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`, runId: run.runId, projectId, type: jobType as any, label: jobType, status: "queued", operation: "allowlisted", logLines: [], redactionStatus: "redacted" });

  run.jobs.unshift(job);
  run.status = routeStatusFromJobs(run.jobs);
  run.logs = appendRunLogs(run.logs, job);
  run.updatedAt = new Date().toISOString();

  state.idempotency[idemKey] = { type: "job", runId: run.runId, jobId: job.id };
  saveProjectState(projectId, state);
  return NextResponse.json(job, { status: 201 });
}
