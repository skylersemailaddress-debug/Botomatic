import { getJsonSafe } from "./api";
import { getExecutionRun, type ExecutionRun } from "./execution";
import type { OrchestrationStage } from "./orchestration";
import type { ApiResult, TruthState } from "./truth";

type ProjectStatus = {
  projectStatus?: string;
  objective?: string;
  nextStep?: string;
  activeRunId?: string;
  latestRunId?: string;
  latestPrompt?: string;
  latestRun?: { runId?: string; status?: string; stages?: OrchestrationStage[] };
  runtime?: { previewUrl?: string; status?: string };
  services?: Array<{ name: string; status: string }>;
  database?: { schema?: Array<{ table: string; rows?: number }> };
  tests?: { total?: number; passed?: number; failed?: number; skipped?: number };
  logs?: string[];
  commits?: Array<{ message: string; author?: string; time?: string }>;
  codeChanges?: Array<{ path?: string; summary?: string }>;
  copilotActivity?: Array<{ message?: string; timestamp?: string }>;
};

type HealthStatus = { status?: string };

type OverviewStatus = { latestRun?: { runId?: string; status?: string; stages?: OrchestrationStage[] }; objective?: string; nextStep?: string; activeRunId?: string; latestRunId?: string; latestPrompt?: string; activity?: Array<{ label: string }> };

export type ProDashboardData = {
  truth: TruthState;
  project: ApiResult<ProjectStatus>;
  overview: ApiResult<OverviewStatus>;
  health: ApiResult<HealthStatus>;
  execution: ApiResult<ExecutionRun>;
};

export async function getProDashboardData(projectId: string): Promise<ProDashboardData> {
  const [project, overview, health, execution] = await Promise.all([
    getJsonSafe<ProjectStatus>(`/api/projects/${projectId}/status`),
    getJsonSafe<OverviewStatus>(`/api/projects/${projectId}/ui/overview`),
    getJsonSafe<HealthStatus>("/api/health"),
    getExecutionRun(projectId),
  ]);

  const truth: TruthState = project.ok || overview.ok || health.ok ? "connected" : "not_connected";
  return { truth, project, overview, health, execution };
}
