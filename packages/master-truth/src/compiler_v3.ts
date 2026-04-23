import { validateMasterTruth } from "./schema";
import { extractStructuredFieldsV2 } from "./extractor_v2";
import { computeConfidenceV2 } from "./scoring_v2";
import { decideClarification } from "./clarificationPolicy";

export function compileConversationToMasterTruthV3(input: { projectId: string; appName: string; request: string }) {
  const extracted = extractStructuredFieldsV2(input.request);
  const provisional = validateMasterTruth({
    ...extracted,
    confidence: 0,
  });
  const confidence = computeConfidenceV2(provisional);
  const decision = decideClarification(confidence);

  const truth = validateMasterTruth({
    ...extracted,
    confidence,
  });

  return {
    ...truth,
    decision,
    status: decision === "must_clarify" ? "needs_clarification" : "ready",
  };
}
