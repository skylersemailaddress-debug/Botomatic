import { ClarificationItem, MasterSpec } from "./specModel";
import { isHighRiskField, shouldAutoDecide } from "./autonomyPolicy";

function item(field: string, question: string, importance: number, risk: "low" | "medium" | "high", userDelegated: boolean): ClarificationItem {
  const mustAsk = importance >= 9 || isHighRiskField(field);
  return {
    id: `q_${field.replace(/[^a-z0-9]+/gi, "_").toLowerCase()}`,
    field,
    question,
    importance,
    risk,
    mustAsk,
    requiresApproval: mustAsk || (importance >= 7 && risk !== "low"),
    suggestedDefault: shouldAutoDecide({ field, importance, risk, userDelegated }) ? "Use enterprise-safe default." : undefined,
  };
}

export function planClarifications(spec: MasterSpec, userDelegated: boolean): ClarificationItem[] {
  const qs: ClarificationItem[] = [];
  if (!spec.authModel) qs.push(item("auth/security", "Which authentication model is required in production (OIDC, SSO, passwordless, mixed)?", 10, "high", userDelegated));
  if (!spec.tenancyModel) qs.push(item("tenancy", "Is this single-tenant, multi-tenant, or hybrid?", 9, "high", userDelegated));
  if (spec.payments.length > 0 && !spec.pricingModel) qs.push(item("payments", "Which pricing model and billing cadence should be enforced?", 10, "high", userDelegated));
  if (!spec.deploymentTarget) qs.push(item("deployment", "Where should production deploy and who owns env secrets?", 8, "medium", userDelegated));
  if (spec.permissions.length === 0) qs.push(item("permissions", "Define role permissions matrix for critical actions.", 9, "high", userDelegated));
  if (spec.workflows.length < 2) qs.push(item("workflows", "What are the top 3 user workflows that must ship in V1?", 8, "medium", userDelegated));
  if (spec.complianceRequirements.length === 0) qs.push(item("compliance", "Any compliance obligations (GDPR, SOC2, HIPAA, PCI)?", 9, "high", userDelegated));
  if (spec.dataEntities.length < 2) qs.push(item("data model", "Which core entities and retention/deletion rules are required?", 9, "high", userDelegated));

  return qs
    .sort((a, b) => b.importance - a.importance)
    .slice(0, 7);
}
