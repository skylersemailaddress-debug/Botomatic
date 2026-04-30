import { getJsonSafe, postJsonSafe } from "./api";
import type { ApiResult } from "./truth";

export type ExecutionJobStatus = "queued" | "running" | "succeeded" | "failed" | "blocked" | "cancelled" | "unknown";
export type ExecutionJobType = "plan" | "generate_files" | "update_files" | "install_dependencies" | "run_tests" | "run_lint" | "run_build" | "start_preview" | "deploy" | "rollback" | "unknown";
export type ExecutionJob = { id?: string; runId?: string; projectId: string; type: ExecutionJobType; label: string; status: ExecutionJobStatus; startedAt?: string; completedAt?: string; error?: string; resultSummary?: string; artifactPath?: string; logLines?: string[] };
export type ExecutionRun = { runId?: string; projectId: string; status: ExecutionJobStatus; jobs: ExecutionJob[]; logs?: string[]; updatedAt?: string };

const isObject = (value: unknown): value is Record<string, unknown> => Boolean(value) && typeof value === "object" && !Array.isArray(value);
const readString = (obj: Record<string, unknown>, key: string): string | undefined => (typeof obj[key] === "string" ? (obj[key] as string) : undefined);

function normalizeStatus(value: unknown): ExecutionJobStatus {
  const status = String(value || "").toLowerCase();
  if (["queued", "running", "succeeded", "failed", "blocked", "cancelled", "unknown"].includes(status)) return status as ExecutionJobStatus;
  if (status === "pending") return "queued";
  if (status === "complete" || status === "completed" || status === "done" || status === "success") return "succeeded";
  return "unknown";
}
function normalizeType(value: unknown): ExecutionJobType {
  const type = String(value || "").toLowerCase();
  const known: ExecutionJobType[] = ["plan", "generate_files", "update_files", "install_dependencies", "run_tests", "run_lint", "run_build", "start_preview", "deploy", "rollback", "unknown"];
  return known.includes(type as ExecutionJobType) ? (type as ExecutionJobType) : "unknown";
}

function normalizeJobs(projectId: string, runId: string | undefined, payloadRaw: unknown): ExecutionJob[] {
  if (!Array.isArray(payloadRaw)) return [];
  return payloadRaw.map((item, index) => {
    const row = isObject(item) ? item : {};
    return {
      id: readString(row, "id") || readString(row, "jobId"),
      runId: readString(row, "runId") || runId,
      projectId,
      type: normalizeType(row.type || row.jobType),
      label: readString(row, "label") || readString(row, "name") || `Job ${index + 1}`,
      status: normalizeStatus(row.status),
      startedAt: readString(row, "startedAt"),
      completedAt: readString(row, "completedAt"),
      error: readString(row, "error") || readString(row, "message"),
      resultSummary: readString(row, "resultSummary") || readString(row, "summary"),
      artifactPath: readString(row, "artifactPath"),
      logLines: Array.isArray(row.logLines) ? row.logLines.map((line) => String(line)) : undefined,
    };
  });
}

export function normalizeExecutionRun(projectId: string, payloadRaw: unknown, fallbackRunId?: string): ExecutionRun {
  const payload = isObject(payloadRaw) ? payloadRaw : {};
  const latestRun = (isObject(payload.latestRun) ? payload.latestRun : undefined) || (isObject(payload.run) ? payload.run : undefined) || (isObject(payload.execution) ? payload.execution : undefined) || {};
  const runId = readString(payload, "runId") || readString(latestRun, "runId") || readString(latestRun, "id") || fallbackRunId;
  const jobs = normalizeJobs(projectId, runId, payload.jobs || latestRun.jobs || payload.stages || latestRun.stages);
  const logs = Array.isArray(payload.logs) ? payload.logs.map((line) => String(line)) : (Array.isArray(latestRun.logs) ? latestRun.logs.map((line) => String(line)) : jobs.flatMap((j) => j.logLines || []));
  return { runId, projectId, status: normalizeStatus(payload.status || latestRun.status || jobs[0]?.status), jobs, logs, updatedAt: readString(payload, "updatedAt") || readString(latestRun, "updatedAt") };
}

export async function getExecutionRun(projectId: string, runId?: string): Promise<ApiResult<ExecutionRun>> {
  const endpoints = [runId ? `/api/projects/${encodeURIComponent(projectId)}/execution/${encodeURIComponent(runId)}` : null, `/api/projects/${encodeURIComponent(projectId)}/execution`, `/api/projects/${encodeURIComponent(projectId)}/status`, `/api/projects/${encodeURIComponent(projectId)}/state`, `/api/projects/${encodeURIComponent(projectId)}/ui/overview`].filter(Boolean) as string[];
  for (const endpoint of endpoints) {
    const result = await getJsonSafe<unknown>(endpoint);
    if (result.ok) return { ok: true, data: normalizeExecutionRun(projectId, result.data, runId) };
    if (result.status && result.status !== 404) return { ok: false, state: result.state, message: "Execution status unavailable", status: result.status };
  }
  return { ok: false, state: "empty", message: "No execution run yet", status: 404 };
}

export async function startExecutionJob(projectId: string, jobType: ExecutionJobType, payload?: unknown): Promise<ApiResult<ExecutionJob>> {
  const body = { projectId, jobType, payload };
  const endpoints = [`/api/projects/${encodeURIComponent(projectId)}/jobs`, `/api/projects/${encodeURIComponent(projectId)}/execution`];
  // Future candidates (not activated here): /api/orchestrate/action, /api/hybrid-ci
  for (const endpoint of endpoints) {
    const result = await postJsonSafe<unknown, typeof body>(endpoint, body);
    if (result.ok) {
      const run = normalizeExecutionRun(projectId, result.data);
      const first = run.jobs[0];
      if (first) return { ok: true, data: first };
      continue;
    }
    if (result.status && result.status !== 404) return { ok: false, state: result.state, message: "Execution runner unavailable", status: result.status };
  }
  return { ok: false, state: "empty", message: "Execution runner unavailable", status: 404 };
}
