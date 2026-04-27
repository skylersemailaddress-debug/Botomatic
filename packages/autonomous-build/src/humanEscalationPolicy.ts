import { classifyBlocker } from "./blockerClassifier";

export type EscalationDecision = {
  escalate: boolean;
  reason: string;
  policy: "human_required" | "autonomous_assumption";
};

const HUMAN_REQUIRED_CATEGORIES = new Set([
  "missing_secrets",
  "live_deployment_approval",
  "paid_provider_action",
  "legal_compliance",
  "destructive_rewrite",
  "irreversible_data_loss",
  "high_risk_contradiction",
]);

export function evaluateHumanEscalation(input: { code: string; detail: string }): EscalationDecision {
  const classification = classifyBlocker(input);
  if (classification.requiresHumanEscalation || HUMAN_REQUIRED_CATEGORIES.has(classification.category)) {
    return {
      escalate: true,
      reason: classification.reason,
      policy: "human_required",
    };
  }

  return {
    escalate: false,
    reason: "Issue is low/medium risk; proceed autonomously and log assumption.",
    policy: "autonomous_assumption",
  };
}
