export type ProjectCheckpoint = {
  checkpointId: string;
  projectId: string;
  kind: "plan" | "execution" | "validation" | "summary";
  summary: string;
  state: Record<string, unknown>;
  createdAt: string;
};

export function createCheckpoint(input: {
  projectId: string;
  kind: ProjectCheckpoint["kind"];
  summary: string;
  state: Record<string, unknown>;
}): ProjectCheckpoint {
  return {
    checkpointId: `chk_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
    projectId: input.projectId,
    kind: input.kind,
    summary: input.summary,
    state: input.state,
    createdAt: new Date().toISOString(),
  };
}
