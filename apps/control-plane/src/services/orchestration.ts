import { getJsonSafe, postJsonSafe } from "./api";
import type { ApiResult } from "./truth";

export type OrchestrationStageStatus = "pending" | "queued" | "running" | "complete" | "failed" | "blocked" | "unknown";

export type OrchestrationStage = {
  id?: string;
  label: string;
  status: OrchestrationStageStatus;
  detail?: string;
  updatedAt?: string;
};

export type OrchestrationGraph = {
  runId?: string;
  projectId: string;
  objective?: string;
  nextStep?: string;
  stages: OrchestrationStage[];
};

export type OrchestrationRun = {
  runId?: string;
  status?: string;
  graph: OrchestrationGraph;
};

export type IntakeRequest = { projectId: string; prompt: string };
export type IntakeResponse = { runId?: string; graph: OrchestrationGraph; status?: string };
export type OrchestrationStatusResponse = { runId?: string; graph: OrchestrationGraph; status?: string };

function normalizeStageStatus(value: unknown): OrchestrationStageStatus {
  const status = String(value || "").toLowerCase();
  if (["pending", "queued", "running", "complete", "failed", "blocked"].includes(status)) return status as OrchestrationStageStatus;
  if (status === "done" || status === "completed") return "complete";
  return "unknown";
}

function normalizeStages(raw: unknown): OrchestrationStage[] {
  if (!Array.isArray(raw)) return [];
  return raw.map((stage: any, index) => ({
    id: typeof stage?.id === "string" ? stage.id : undefined,
    label: String(stage?.label || stage?.name || `Stage ${index + 1}`),
    status: normalizeStageStatus(stage?.status),
    detail: typeof stage?.detail === "string" ? stage.detail : undefined,
    updatedAt: typeof stage?.updatedAt === "string" ? stage.updatedAt : undefined,
  }));
}

function fromPayload(projectId: string, payload: any, fallbackRunId?: string): OrchestrationStatusResponse {
  const latestRun = payload?.latestRun || payload?.run || payload?.orchestration || null;
  const graphRaw = payload?.graph || latestRun?.graph || null;
  const stages = normalizeStages(graphRaw?.stages || latestRun?.stages || payload?.stages);
  return {
    runId: payload?.runId || latestRun?.runId || latestRun?.id || fallbackRunId,
    status: payload?.status || latestRun?.status,
    graph: {
      runId: payload?.runId || latestRun?.runId || latestRun?.id || fallbackRunId,
      projectId: String(payload?.projectId || projectId),
      objective: payload?.objective || latestRun?.objective || graphRaw?.objective,
      nextStep: payload?.nextStep || latestRun?.nextStep || graphRaw?.nextStep,
      stages,
    },
  };
}

export async function submitVibeIntake(projectId: string, prompt: string): Promise<ApiResult<IntakeResponse>> {
  const body = { projectId, prompt, request: prompt, message: prompt };
  const candidates = [
    `/api/projects/${encodeURIComponent(projectId)}/intake`,
    "/api/projects/intake",
    "/api/orchestrate/action",
  ];

  for (const endpoint of candidates) {
    const result = await postJsonSafe<any, typeof body>(endpoint, body);
    if (result.ok) {
      return { ok: true, data: fromPayload(projectId, result.data) };
    }
    if (result.status && result.status !== 404) {
      return { ok: false, state: result.state, message: "Planner unavailable", status: result.status };
    }
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
    const result = await getJsonSafe<any>(endpoint);
    if (result.ok) {
      return { ok: true, data: fromPayload(projectId, result.data, runId) };
    }
    if (result.status && result.status !== 404) {
      return { ok: false, state: result.state, message: "Execution status unavailable", status: result.status };
    }
  }

  return { ok: false, state: "empty", message: "Orchestration unavailable", status: 404 };
}
