export type ClarificationDecision = "auto_build" | "auto_build_with_assumptions" | "must_clarify";

export function decideClarification(confidence: number): ClarificationDecision {
  if (confidence >= 0.75) return "auto_build";
  if (confidence >= 0.45) return "auto_build_with_assumptions";
  return "must_clarify";
}
