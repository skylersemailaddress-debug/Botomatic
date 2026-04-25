import { getJson } from "./api";

export type ProjectOverview = {
  latestRun: {
    status: string;
  };
  summary: {
    packetCount: number;
    completedPackets: number;
    failedPackets: number;
  };
  readiness: {
    status: string;
  };
  activity?: Array<{
    label: string;
  }>;
  latestArtifact: {
    changedFiles: number;
  };
  blockers?: string[];
};

export async function getProjectOverview(projectId: string) {
  return getJson<ProjectOverview>(`/api/projects/${projectId}/ui/overview`);
}
