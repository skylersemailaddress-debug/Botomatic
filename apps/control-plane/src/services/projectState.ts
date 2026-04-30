import { getJsonSafe } from "./api";
import type { OrchestrationStage } from "./orchestration";
import type { ApiResult } from "./truth";

export type ProjectObjectiveState = {
  objective?: string;
  nextStep?: string;
};

export type ProjectResumeState = {
  projectId: string;
  objective?: string;
  nextStep?: string;
  activeRunId?: string;
  latestRunId?: string;
  latestPrompt?: string;
  stages?: OrchestrationStage[];
  updatedAt?: string;
};

export type ProjectStateResponse = {
  projectId: string;
  objective?: string;
  nextStep?: string;
  activeRunId?: string;
  latestRunId?: string;
  latestPrompt?: string;
  latestRun?: {
    runId?: string;
    status?: string;
    stages?: OrchestrationStage[];
  };
  orchestration?: {
    runId?: string;
    status?: string;
    stages?: OrchestrationStage[];
  };
  activity?: Array<{ label?: string; timestamp?: string; type?: string }>;
};

const isObject = (value: unknown): value is Record<string, unknown> => Boolean(value) && typeof value === "object" && !Array.isArray(value);
const readString = (obj: Record<string, unknown>, key: string): string | undefined => (typeof obj[key] === "string" ? (obj[key] as string) : undefined);
const readObject = (obj: Record<string, unknown>, key: string): Record<string, unknown> | undefined => (isObject(obj[key]) ? (obj[key] as Record<string, unknown>) : undefined);

function normalizeStageStatus(value: unknown): OrchestrationStage["status"] {
  const status = String(value || "").toLowerCase();
  if (["pending", "queued", "running", "complete", "failed", "blocked"].includes(status)) return status as OrchestrationStage["status"];
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
      updatedAt: readString(stage, "updatedAt") || readString(stage, "timestamp"),
    };
  });
}

function normalizeState(projectId: string, payloadRaw: unknown): ProjectStateResponse {
  const payload = isObject(payloadRaw) ? payloadRaw : {};
  const latestRun = readObject(payload, "latestRun") || readObject(payload, "run") || {};
  const orchestration = readObject(payload, "orchestration") || {};
  const runId = readString(payload, "runId") || readString(orchestration, "runId") || readString(latestRun, "runId") || readString(latestRun, "id");
  const latestRunId = readString(payload, "latestRunId") || readString(latestRun, "runId") || readString(latestRun, "id") || runId;
  const activeRunId = readString(payload, "activeRunId") || readString(orchestration, "runId") || runId;

  return {
    projectId: readString(payload, "projectId") || projectId,
    objective: readString(payload, "objective") || readString(orchestration, "objective") || readString(latestRun, "objective"),
    nextStep: readString(payload, "nextStep") || readString(orchestration, "nextStep") || readString(latestRun, "nextStep"),
    activeRunId,
    latestRunId,
    latestPrompt: readString(payload, "latestPrompt") || readString(payload, "prompt") || readString(orchestration, "latestPrompt"),
    latestRun: {
      runId: latestRunId,
      status: readString(latestRun, "status") || readString(payload, "status"),
      stages: normalizeStages(latestRun.stages || payload.stages),
    },
    orchestration: {
      runId: readString(orchestration, "runId") || activeRunId,
      status: readString(orchestration, "status") || readString(payload, "status"),
      stages: normalizeStages(orchestration.stages || latestRun.stages || payload.stages),
    },
    activity: Array.isArray(payload.activity) ? payload.activity.map((item) => {
      const row = isObject(item) ? item : {};
      return { label: readString(row, "label"), timestamp: readString(row, "timestamp") || readString(row, "time"), type: readString(row, "type") };
    }) : [],
  };
}

export async function getProjectState(projectId: string): Promise<ApiResult<ProjectStateResponse>> {
  const candidates = [
    `/api/projects/${encodeURIComponent(projectId)}/state`,
    `/api/projects/${encodeURIComponent(projectId)}/status`,
    `/api/projects/${encodeURIComponent(projectId)}/ui/overview`,
  ];
  for (const endpoint of candidates) {
    const result = await getJsonSafe<unknown>(endpoint);
    if (result.ok) return { ok: true, data: normalizeState(projectId, result.data) };
    if (result.status && result.status !== 404) return { ok: false, state: result.state, message: "Project state unavailable", status: result.status };
  }
  return { ok: false, state: "empty", message: "Project state unavailable", status: 404 };
}

export async function getProjectResume(projectId: string): Promise<ApiResult<ProjectResumeState>> {
  const candidates = [
    `/api/projects/${encodeURIComponent(projectId)}/resume`,
    `/api/projects/${encodeURIComponent(projectId)}/state`,
    `/api/projects/${encodeURIComponent(projectId)}/status`,
    `/api/projects/${encodeURIComponent(projectId)}/ui/overview`,
  ];
  for (const endpoint of candidates) {
    const result = await getJsonSafe<unknown>(endpoint);
    if (result.ok) {
      const normalized = normalizeState(projectId, result.data);
      return {
        ok: true,
        data: {
          projectId: normalized.projectId,
          objective: normalized.objective,
          nextStep: normalized.nextStep,
          activeRunId: normalized.activeRunId,
          latestRunId: normalized.latestRunId,
          latestPrompt: normalized.latestPrompt,
          stages: normalized.orchestration?.stages || normalized.latestRun?.stages || [],
          updatedAt: normalized.activity?.[0]?.timestamp,
        },
      };
    }
    if (result.status && result.status !== 404) return { ok: false, state: result.state, message: "Resume unavailable", status: result.status };
  }
  return { ok: false, state: "empty", message: "No persisted state yet", status: 404 };
}
