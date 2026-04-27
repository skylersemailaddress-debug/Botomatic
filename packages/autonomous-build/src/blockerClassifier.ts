export type BlockerRisk = "low" | "medium" | "high";

export type BlockerClassification = {
  risk: BlockerRisk;
  category:
    | "missing_secrets"
    | "live_deployment_approval"
    | "paid_provider_action"
    | "legal_compliance"
    | "destructive_rewrite"
    | "irreversible_data_loss"
    | "high_risk_contradiction"
    | "runtime_failure";
  requiresHumanEscalation: boolean;
  reason: string;
};

export function classifyBlocker(input: { code: string; detail: string }): BlockerClassification {
  const key = `${input.code} ${input.detail}`.toLowerCase();

  if (key.includes("secret") || key.includes("credential")) {
    return {
      risk: "high",
      category: "missing_secrets",
      requiresHumanEscalation: true,
      reason: "Required secrets are missing and must be supplied by a human operator.",
    };
  }
  if (key.includes("approval") || key.includes("live deployment")) {
    return {
      risk: "high",
      category: "live_deployment_approval",
      requiresHumanEscalation: true,
      reason: "Explicit live deployment approval is required.",
    };
  }
  if (key.includes("paid") || key.includes("billing")) {
    return {
      risk: "high",
      category: "paid_provider_action",
      requiresHumanEscalation: true,
      reason: "Paid provider action requires explicit human confirmation.",
    };
  }
  if (key.includes("legal") || key.includes("compliance")) {
    return {
      risk: "high",
      category: "legal_compliance",
      requiresHumanEscalation: true,
      reason: "Legal/compliance decisions require human escalation.",
    };
  }
  if (key.includes("destructive") || key.includes("rewrite")) {
    return {
      risk: "high",
      category: "destructive_rewrite",
      requiresHumanEscalation: true,
      reason: "Destructive rewrite requires explicit operator approval.",
    };
  }
  if (key.includes("data loss") || key.includes("irreversible")) {
    return {
      risk: "high",
      category: "irreversible_data_loss",
      requiresHumanEscalation: true,
      reason: "Irreversible or data-loss action requires human escalation.",
    };
  }
  if (key.includes("contradiction") || key.includes("conflict")) {
    return {
      risk: "high",
      category: "high_risk_contradiction",
      requiresHumanEscalation: true,
      reason: "High-risk contradictions remain unresolved and need human direction.",
    };
  }

  return {
    risk: key.includes("critical") ? "medium" : "low",
    category: "runtime_failure",
    requiresHumanEscalation: false,
    reason: "Low/medium risk execution issue is eligible for autonomous repair.",
  };
}
