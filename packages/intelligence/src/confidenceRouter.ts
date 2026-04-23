export type ConfidenceDecision = {
  accepted: boolean;
  reroute: boolean;
  reason: string;
};

export function evaluateModelOutputConfidence(input: {
  confidence: number;
  threshold?: number;
}): ConfidenceDecision {
  const threshold = input.threshold ?? 0.75;

  if (input.confidence >= threshold) {
    return {
      accepted: true,
      reroute: false,
      reason: "confidence threshold met",
    };
  }

  return {
    accepted: false,
    reroute: true,
    reason: "confidence below threshold",
  };
}
