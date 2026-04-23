import { saveExecutionTraceDB } from "../../persistence/src/executionTraceRepo";
import { ModelExecutionTrace } from "./executionTrace";

export async function recordExecutionTraceV2(trace: ModelExecutionTrace) {
  await saveExecutionTraceDB(trace);
  return trace;
}
