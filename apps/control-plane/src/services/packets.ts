import { getJson } from "./api";

export type ProjectPacket = {
  packetId: string;
  status: string;
  goal: string;
};

export type ProjectPacketsResponse = {
  packets: ProjectPacket[];
};

export type ProjectArtifact = {
  operationId: string;
  status: string;
  prUrl?: string;
  error?: string;
};

export type ProjectArtifactsResponse = {
  artifacts: ProjectArtifact[];
};

export async function getProjectPackets(projectId: string) {
  return getJson<ProjectPacketsResponse>(`/api/projects/${projectId}/ui/packets`);
}

export async function getProjectArtifacts(projectId: string) {
  return getJson<ProjectArtifactsResponse>(`/api/projects/${projectId}/ui/artifacts`);
}
