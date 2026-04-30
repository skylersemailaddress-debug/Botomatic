import { getJsonSafe, postJsonSafe } from "./api";
import type { ApiResult } from "./truth";

export type OrchestrationStageStatus = "pending" | "queued" | "running" | "complete" | "failed" | "blocked" | "unknown";
export type OrchestrationStage = { id?: string; label: string; status: OrchestrationStageStatus; detail?: string; updatedAt?: string };
export type OrchestrationGraph = { runId?: string; projectId: string; objective?: string; nextStep?: string; stages: OrchestrationStage[] };
export type OrchestrationRun = { runId?: string; status?: string; graph: OrchestrationGraph };
export type IntakeRequest = { projectId: string; prompt: string };
export type IntakeResponse = { runId?: string; graph: OrchestrationGraph; status?: string };
export type OrchestrationStatusResponse = { runId?: string; graph: OrchestrationGraph; status?: string };

const isObject = (value: unknown): value is Record<string, unknown> => Boolean(value) && typeof value === "object" && !Array.isArray(value);
const readString = (obj: Record<string, unknown>, key: string): string | undefined => (typeof obj[key] === "string" ? (obj[key] as string) : undefined);
const readObject = (obj: Record<string, unknown>, key: string): Record<string, unknown> | undefined => (isObject(obj[key]) ? (obj[key] as Record<string, unknown>) : undefined);
const readArray = (obj: Record<string, unknown>, key: string): unknown[] => (Array.isArray(obj[key]) ? (obj[key] as unknown[]) : []);

function normalizeStageStatus(value: unknown): OrchestrationStageStatus {
  const status = String(value || "").toLowerCase();
  if (["pending", "queued", "running", "complete", "failed", "blocked"].includes(status)) return status as OrchestrationStageStatus;
  if (status === "done" || status === "completed") return "complete";
  return "unknown";
}

function normalizeStages(raw: unknown): OrchestrationStage[] {
  if (!Array.isArray(raw)) return [];
  return raw.map((item, index) => {
    const stage = isObject(item) ? item : {};
    return {
      id: readString(stage, "id"),
      label: readString(stage, "label") || readString(stage, "name") || `Stage ${index + 1}`,
      status: normalizeStageStatus(stage.status),
      detail: readString(stage, "detail"),
      updatedAt: readString(stage, "updatedAt"),
    };
  });
}

function fromPayload(projectId: string, payloadRaw: unknown, fallbackRunId?: string): OrchestrationStatusResponse {
  const payload = isObject(payloadRaw) ? payloadRaw : {};
  const latestRun = readObject(payload, "latestRun") || readObject(payload, "run") || readObject(payload, "orchestration") || {};
  const graphRaw = readObject(payload, "graph") || readObject(latestRun, "graph") || {};
  const stages = normalizeStages(graphRaw.stages || latestRun.stages || readArray(payload, "stages"));
  const resolvedRunId = readString(payload, "runId") || readString(latestRun, "runId") || readString(latestRun, "id") || fallbackRunId;
  return {
    runId: resolvedRunId,
    status: readString(payload, "status") || readString(latestRun, "status"),
    graph: {
      runId: resolvedRunId,
      projectId: readString(payload, "projectId") || projectId,
      objective: readString(payload, "objective") || readString(latestRun, "objective") || readString(graphRaw, "objective"),
      nextStep: readString(payload, "nextStep") || readString(latestRun, "nextStep") || readString(graphRaw, "nextStep"),
      stages,
    },
  };
}

export async function submitVibeIntake(projectId: string, prompt: string): Promise<ApiResult<IntakeResponse>> {
  const body: IntakeRequest & { request: string; message: string } = { projectId, prompt, request: prompt, message: prompt };
  const candidates = [`/api/projects/${encodeURIComponent(projectId)}/intake`, "/api/projects/intake", "/api/orchestrate/action"];
  for (const endpoint of candidates) {
    const result = await postJsonSafe<unknown, typeof body>(endpoint, body);
    if (result.ok) return { ok: true, data: fromPayload(projectId, result.data) };
    if (result.status && result.status !== 404) return { ok: false, state: result.state, message: "Planner unavailable", status: result.status };
  }
  return { ok: false, state: "empty", message: "Orchestration unavailable", status: 404 };
}

export async function getOrchestrationStatus(projectId: string, runId?: string): Promise<ApiResult<OrchestrationStatusResponse>> {
  const candidates = [
    `/api/projects/${encodeURIComponent(projectId)}/status`,
    `/api/projects/${encodeURIComponent(projectId)}/ui/overview`,
    `/api/projects/${encodeURIComponent(projectId)}/state`,
    runId ? `/api/orchestrate/${encodeURIComponent(runId)}/status` : null,
  ].filter(Boolean) as string[];
  for (const endpoint of candidates) {
    const result = await getJsonSafe<unknown>(endpoint);
    if (result.ok) return { ok: true, data: fromPayload(projectId, result.data, runId) };
    if (result.status && result.status !== 404) return { ok: false, state: result.state, message: "Execution status unavailable", status: result.status };
  }
  return { ok: false, state: "empty", message: "Orchestration unavailable", status: 404 };
}
