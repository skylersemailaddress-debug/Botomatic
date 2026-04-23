import { getCheckpoints } from "./store";

export function buildExecutionContext(projectId: string) {
  const checkpoints = getCheckpoints(projectId);

  if (!checkpoints.length) {
    return { context: null, checkpoints: [] };
  }

  const latest = checkpoints[checkpoints.length - 1];

  return {
    context: latest.state,
    summary: latest.summary,
    checkpoints: checkpoints.map(c => ({ id: c.checkpointId, kind: c.kind, createdAt: c.createdAt })),
  };
}
