import { createCheckpoint } from "./checkpoint";
import { compressProjectState } from "./compression";
import { saveCheckpoint } from "./store";

export function checkpointProjectState(input: {
  projectId: string;
  kind: "plan" | "execution" | "validation" | "summary";
  state: Record<string, unknown>;
}) {
  const compressed = compressProjectState(input.state);
  const checkpoint = createCheckpoint({
    projectId: input.projectId,
    kind: input.kind,
    summary: compressed.summary,
    state: compressed.reduced,
  });

  saveCheckpoint(checkpoint);
  return checkpoint;
}
