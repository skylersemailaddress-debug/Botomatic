import { makeAssumption } from "./assumptionLedger";
import { detectChatStyle } from "./chatStyleDetector";
import { planClarifications } from "./clarificationPlanner";
import { computeCompleteness } from "./specCompleteness";
import { generateRecommendations } from "./recommendationEngine";
import { MasterSpec } from "./specModel";

export function analyzeSpec(input: {
  appName: string;
  request: string;
  blueprint: {
    category: string;
    defaultPages: string[];
    defaultComponents: string[];
    defaultRoles: string[];
    defaultPermissions: string[];
    defaultEntities: string[];
    defaultRelationships: string[];
    defaultWorkflows: string[];
    defaultIntegrations: string[];
    launchCriteria: string[];
    acceptanceCriteria: string[];
  };
  actorId?: string;
}): {
  spec: MasterSpec;
  style: string;
  clarifications: ReturnType<typeof planClarifications>;
} {
  const nowActor = input.actorId || "system";
  const text = input.request;
  const style = detectChatStyle(text);
  const delegated = /(you decide|decide for me|autopilot)/i.test(text);

  const baseSpec: MasterSpec = {
    appName: input.appName,
    appType: input.blueprint.category,
    targetUsers: ["admin", "operator", "end_user"],
    customerSegments: ["SMB", "Mid-market"],
    coreProblem: text.slice(0, 180) || "Problem statement required.",
    coreOutcome: "Deliver a production-grade application with validated workflows.",
    businessModel: /(subscription|saas|monthly)/i.test(text) ? "subscription" : "commercial_service",
    pricingModel: /(free|trial|paid|tier)/i.test(text) ? "tiered" : "pending_confirmation",
    primaryUserJourneys: ["onboard", "complete core task", "admin review"],
    pages: input.blueprint.defaultPages,
    components: input.blueprint.defaultComponents,
    roles: input.blueprint.defaultRoles,
    permissions: input.blueprint.defaultPermissions,
    dataEntities: input.blueprint.defaultEntities,
    relationships: input.blueprint.defaultRelationships,
    workflows: input.blueprint.defaultWorkflows,
    stateMachines: ["draft_to_published", "pending_to_approved"],
    integrations: input.blueprint.defaultIntegrations,
    payments: /(payment|billing|checkout|subscription)/i.test(text) ? ["payment_provider_pending"] : [],
    notifications: ["email"],
    filesAndMedia: ["uploads"],
    adminTools: ["audit_log", "role_admin"],
    analytics: ["usage_dashboard"],
    contentCms: ["basic_content_blocks"],
    authModel: /(oidc|sso|auth0)/i.test(text) ? "oidc" : "oidc",
    tenancyModel: /(multi-tenant|multitenant)/i.test(text) ? "multi_tenant" : "single_tenant",
    securityRequirements: ["rbac_enforced", "audit_events", "token_validation"],
    complianceRequirements: /(hipaa|gdpr|soc2|pci)/i.test(text) ? ["compliance_review_required"] : [],
    deploymentTarget: "vercel",
    envVars: ["OIDC_ISSUER_URL", "OIDC_CLIENT_ID", "SUPABASE_URL", "SUPABASE_SERVICE_ROLE_KEY"],
    brandDirection: "Trustworthy and execution-focused",
    uiStyle: "Clean control-plane with dense operational clarity",
    responsiveRequirements: ["desktop", "tablet", "mobile"],
    accessibilityRequirements: ["wcag_aa", "keyboard_navigation"],
    acceptanceCriteria: input.blueprint.acceptanceCriteria,
    launchCriteria: input.blueprint.launchCriteria,
    assumptions: [
      makeAssumption({
        field: "notification provider",
        decision: "Email is enabled by default",
        reason: "Low-risk baseline for transactional workflows",
        importance: 4,
        risk: "low",
        madeBy: nowActor,
      }),
      makeAssumption({
        field: "auth/security",
        decision: "OIDC with role guards",
        reason: "Enterprise-safe default",
        importance: 9,
        risk: "high",
        madeBy: nowActor,
      }),
    ],
    openQuestions: [],
    recommendations: [],
    excludedItems: ["prototype-only shortcuts"],
    risks: [],
    readinessScore: 0,
    completeness: {
      criticalCompleteness: 0,
      commercialCompleteness: 0,
      implementationCompleteness: 0,
      launchCompleteness: 0,
      riskCompleteness: 0,
    },
  };

  const recommendations = generateRecommendations(baseSpec);
  const clarifications = planClarifications(baseSpec, delegated);
  const openQuestions = clarifications.filter((q) => q.mustAsk).map((q) => q.question);
  const withQuestions = { ...baseSpec, openQuestions, recommendations };
  const completeness = computeCompleteness(withQuestions);
  const readinessScore = Math.round((
    completeness.criticalCompleteness +
    completeness.commercialCompleteness +
    completeness.implementationCompleteness +
    completeness.launchCompleteness +
    completeness.riskCompleteness
  ) / 5);

  const spec: MasterSpec = {
    ...withQuestions,
    completeness,
    readinessScore,
    risks: [
      ...(openQuestions.length > 0 ? ["Unresolved high-risk questions remain"] : []),
      ...(withQuestions.payments.length > 0 ? ["Payment architecture requires explicit confirmation"] : []),
    ],
  };

  return { spec, style, clarifications };
}
