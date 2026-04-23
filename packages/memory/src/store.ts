import { ProjectCheckpoint } from "./checkpoint";

const inMemoryStore: Record<string, ProjectCheckpoint[]> = {};

export function saveCheckpoint(cp: ProjectCheckpoint) {
  if (!inMemoryStore[cp.projectId]) {
    inMemoryStore[cp.projectId] = [];
  }
  inMemoryStore[cp.projectId].push(cp);
}

export function getCheckpoints(projectId: string): ProjectCheckpoint[] {
  return inMemoryStore[projectId] || [];
}
