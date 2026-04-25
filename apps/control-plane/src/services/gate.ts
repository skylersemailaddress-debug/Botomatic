import { getJson } from "./api";

export type ProjectGate = {
  launchStatus: string;
  approvalStatus: string;
  issues?: string[];
  role: string;
};

export async function getProjectGate(projectId: string) {
  return getJson<ProjectGate>(`/api/projects/${projectId}/ui/gate`);
}
