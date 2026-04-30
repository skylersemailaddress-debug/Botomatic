import { getJsonSafe } from "./api";
import type { ApiResult, TruthState } from "./truth";

type ProjectStatus = {
  projectStatus?: string;
  latestRun?: { status?: string; stages?: Array<{ label?: string; status?: string; updatedAt?: string }> };
  runtime?: { previewUrl?: string; status?: string };
  services?: Array<{ name: string; status: string }>;
  database?: { schema?: Array<{ table: string; rows?: number }> };
  tests?: { total?: number; passed?: number; failed?: number; skipped?: number };
  logs?: string[];
  commits?: Array<{ message: string; author?: string; time?: string }>;
};

type HealthStatus = { status?: string };

type OverviewStatus = { latestRun?: { status?: string }; activity?: Array<{ label: string }> };

export type ProDashboardData = {
  truth: TruthState;
  project: ApiResult<ProjectStatus>;
  overview: ApiResult<OverviewStatus>;
  health: ApiResult<HealthStatus>;
};

export async function getProDashboardData(projectId: string): Promise<ProDashboardData> {
  const [project, overview, health] = await Promise.all([
    getJsonSafe<ProjectStatus>(`/api/projects/${projectId}/status`),
    getJsonSafe<OverviewStatus>(`/api/projects/${projectId}/ui/overview`),
    getJsonSafe<HealthStatus>("/api/health"),
  ]);

  const truth: TruthState = project.ok || overview.ok || health.ok ? "connected" : "not_connected";
  return { truth, project, overview, health };
}
