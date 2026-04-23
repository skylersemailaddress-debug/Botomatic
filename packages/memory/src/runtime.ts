import { checkpointProjectState } from "./lifecycle";
import { buildExecutionContext } from "./contextBuilder";
import { saveCheckpointDurable, getCheckpointsDurable } from "./durableStore";

export async function checkpointAndPersist(input: {
  projectId: string;
  kind: "plan" | "execution" | "validation" | "summary";
  state: Record<string, unknown>;
}) {
  const checkpoint = checkpointProjectState(input);
  await saveCheckpointDurable(checkpoint);
  return checkpoint;
}

export async function buildDurableExecutionContext(projectId: string) {
  const durable = await getCheckpointsDurable(projectId);
  if (durable.length > 0) {
    const latest = durable[durable.length - 1];
    return {
      context: latest.state,
      summary: latest.summary,
      checkpoints: durable.map((c) => ({ id: c.checkpointId, kind: c.kind, createdAt: c.createdAt })),
      source: "durable",
    };
  }

  return {
    ...buildExecutionContext(projectId),
    source: "memory",
  };
}
