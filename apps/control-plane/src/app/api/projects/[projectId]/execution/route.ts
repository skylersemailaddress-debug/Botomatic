import { NextRequest, NextResponse } from "next/server";
import { createRun, loadProjectState, saveProjectState, sanitizeProjectId } from "@/server/executionStore";
import { ALLOWLISTED_JOB_TYPES, appendRunLogs, executeAllowlistedJob, routeStatusFromJobs } from "@/server/executionRunner";

export const dynamic = "force-dynamic";

const readBody = async (request: NextRequest) => request.json().catch(() => ({}));

export async function GET(_: NextRequest, { params }: { params: { projectId: string } }) {
  const projectId = sanitizeProjectId(params.projectId);
  const state = loadProjectState(projectId);
  const latest = state.runs.at(-1);
  if (!latest) return NextResponse.json({ error: { code: "not_found", message: "No execution runs yet", retryable: false, details: {} } }, { status: 404 });
  return NextResponse.json(latest);
}

export async function POST(request: NextRequest, { params }: { params: { projectId: string } }) {
  const projectId = sanitizeProjectId(params.projectId);
  const body = await readBody(request);
  const idempotencyKey = typeof body?.idempotencyKey === "string" ? body.idempotencyKey : "";
  if (!idempotencyKey) return NextResponse.json({ error: { code: "bad_request", message: "idempotencyKey is required", retryable: false, details: {} } }, { status: 400 });

  const state = loadProjectState(projectId);
  const idemKey = `execution:${projectId}:${idempotencyKey}`;
  const previous = state.idempotency[idemKey];
  if (previous?.runId) {
    const existing = state.runs.find((run) => run.runId === previous.runId);
    if (existing) return NextResponse.json(existing);
  }

  const run = createRun(projectId, idempotencyKey, typeof body?.objective === "string" ? body.objective : undefined, typeof body?.prompt === "string" ? body.prompt : undefined);
  const requestedJobs = Array.isArray(body?.requestedJobs) ? body.requestedJobs : [];
  const filteredJobs = requestedJobs.filter((job: unknown) => typeof job === "string" && ALLOWLISTED_JOB_TYPES.includes(job as any));
  const targetJobTypes = filteredJobs.length ? filteredJobs : ["file_diff"];

  run.status = "running";
  for (const type of targetJobTypes) {
    const job = await executeAllowlistedJob({ id: `job_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`, runId: run.runId, projectId, type, label: type, status: "queued", operation: "allowlisted", logLines: [], redactionStatus: "redacted" });
    run.jobs.push(job);
    run.logs = appendRunLogs(run.logs, job);
  }

  run.status = routeStatusFromJobs(run.jobs);
  run.updatedAt = new Date().toISOString();
  state.runs.push(run);
  state.idempotency[idemKey] = { type: "execution", runId: run.runId };
  saveProjectState(projectId, state);
  return NextResponse.json(run, { status: 201 });
}
