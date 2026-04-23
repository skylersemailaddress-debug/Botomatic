import { getJson } from "./api";

export async function getProjectPackets(projectId: string) {
  return getJson(`/api/projects/${projectId}/ui/packets`);
}

export async function getProjectArtifacts(projectId: string) {
  return getJson(`/api/projects/${projectId}/ui/artifacts`);
}
