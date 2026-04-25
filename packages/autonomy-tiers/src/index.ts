export type AutonomyTier = "assist" | "bounded_autonomy" | "high_autonomy";

export function resolveAutonomyTier(input: { delegated: boolean; unresolvedHighRiskQuestions: number }): AutonomyTier {
  if (input.unresolvedHighRiskQuestions > 0) return "assist";
  if (input.delegated) return "high_autonomy";
  return "bounded_autonomy";
}

export function allowedActionsForTier(tier: AutonomyTier): string[] {
  if (tier === "assist") return ["analyze", "recommend", "ask_questions"];
  if (tier === "bounded_autonomy") return ["analyze", "plan", "execute_safe_packets", "validate"];
  return ["analyze", "plan", "execute", "validate", "propose_launch"];
}
