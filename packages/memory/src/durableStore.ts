import { ProjectCheckpoint } from "./checkpoint";

const durableFallback: Record<string, ProjectCheckpoint[]> = {};

export async function saveCheckpointDurable(cp: ProjectCheckpoint) {
  if (!durableFallback[cp.projectId]) {
    durableFallback[cp.projectId] = [];
  }
  durableFallback[cp.projectId].push(cp);
}

export async function getCheckpointsDurable(projectId: string): Promise<ProjectCheckpoint[]> {
  return durableFallback[projectId] || [];
}
