import { MasterSpec, SpecRecommendation } from "./specModel";

function rec(area: string, recommendation: string, reason: string, confidence: number, importance: number, risk: "low" | "medium" | "high", requiresApproval = false): SpecRecommendation {
  return {
    id: `rec_${area.replace(/[^a-z0-9]+/gi, "_").toLowerCase()}_${Math.random().toString(36).slice(2, 7)}`,
    area,
    recommendation,
    reason,
    confidence,
    importance,
    risk,
    defaultDecision: recommendation,
    requiresApproval,
    status: "pending",
  };
}

export function generateRecommendations(spec: MasterSpec): SpecRecommendation[] {
  const out: SpecRecommendation[] = [];
  out.push(rec("product_positioning", "Define a clear ICP and problem statement in one sentence.", "Increases execution and GTM focus.", 0.84, 8, "low"));
  out.push(rec("roles_permissions", "Keep admin/reviewer/operator separation with explicit role guards.", "Prevents privilege bleed in production.", 0.92, 9, "medium", true));
  out.push(rec("data_model", "Add immutable audit log entity linked to user and workflow transitions.", "Needed for enterprise accountability.", 0.88, 8, "medium"));
  out.push(rec("security", "Use durable OIDC with token validation and route-level RBAC checks.", "Required for commercial security posture.", 0.96, 10, "high", true));
  out.push(rec("deployment", "Define production env var manifest with owner and rotation policy.", "Reduces runtime misconfiguration risk.", 0.9, 8, "medium"));
  if (spec.payments.length > 0) {
    out.push(rec("payments", "Confirm provider, settlement model, refunds, and dispute handling before build lock.", "Payment mistakes are high-impact and costly.", 0.95, 10, "high", true));
  }
  return out;
}

export function applyRecommendationStatus(recommendations: SpecRecommendation[], acceptedIds: string[], rejectedIds: string[]): SpecRecommendation[] {
  const accepted = new Set(acceptedIds);
  const rejected = new Set(rejectedIds);
  return recommendations.map((r) => {
    if (accepted.has(r.id)) return { ...r, status: "accepted" };
    if (rejected.has(r.id)) return { ...r, status: "rejected" };
    return r;
  });
}
