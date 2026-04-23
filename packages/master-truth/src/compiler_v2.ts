import { extractStructuredFields } from "./extractor";
import { computeConfidence } from "./scoring";
import { validateMasterTruth } from "./schema";

export function compileConversationToMasterTruthV2(input: { projectId: string; appName: string; request: string }) {
  const fields = extractStructuredFields(input.request);
  const confidence = computeConfidence(fields);

  const truth = {
    ...fields,
    confidence
  };

  const validated = validateMasterTruth(truth);

  return {
    ...validated,
    status: confidence > 0.6 ? "ready" : "needs_clarification"
  };
}
