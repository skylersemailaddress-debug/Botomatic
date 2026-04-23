import { ProjectCheckpoint } from "./checkpoint";
import { saveCheckpointDB, getCheckpointsDB } from "../../persistence/src/checkpointRepo";

export async function saveCheckpointDurable(cp: ProjectCheckpoint) {
  await saveCheckpointDB(cp);
}

export async function getCheckpointsDurable(projectId: string): Promise<ProjectCheckpoint[]> {
  return getCheckpointsDB(projectId);
}
