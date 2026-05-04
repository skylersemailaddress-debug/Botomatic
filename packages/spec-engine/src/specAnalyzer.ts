import { makeAssumption } from "./assumptionLedger";
import { detectChatStyle } from "./chatStyleDetector";
import { planClarifications } from "./clarificationPlanner";
import { computeCompleteness } from "./specCompleteness";
import { generateRecommendations } from "./recommendationEngine";
import { MasterSpec } from "./specModel";

// ── Text extraction helpers ───────────────────────────────────────────────────
// These extract as much as possible from the free-text request before falling
// back to blueprint defaults, so the question list only covers genuine gaps.

function extractAuthModel(text: string): string {
  if (/saml|enterprise.?sso|okta|azure.?ad/i.test(text)) return "saml_sso";
  if (/oidc|openid/i.test(text)) return "oidc";
  if (/google.*auth|auth.*google|sign.?in.?with.?google/i.test(text)) return "google_oauth";
  if (/github.*auth|auth.*github|sign.?in.?with.?github/i.test(text)) return "github_oauth";
  if (/magic.?link|passwordless|email.?link/i.test(text)) return "magic_link";
  if (/sms.?otp|phone.?login|otp/i.test(text)) return "sms_otp";
  if (/email.?password|username.?password|credentials|login.?form/i.test(text)) return "email_password";
  if (/oauth|social.?login/i.test(text)) return "oauth";
  return "";
}

function extractTenancyModel(text: string): string {
  if (/multi.?tenant|multitenant|per.?org|per.?team|org.?isolation|organization.?isolated/i.test(text)) return "multi_tenant";
  if (/single.?tenant|one.?tenant|shared.?db/i.test(text)) return "single_tenant";
  return "";
}

function extractPayments(text: string): string[] {
  if (/(payment|billing|checkout|subscription|stripe|invoice|charge|plan|pricing|paid|freemium)/i.test(text)) {
    const provider = /stripe/i.test(text) ? "stripe" : /braintree/i.test(text) ? "braintree" : /paypal/i.test(text) ? "paypal" : "payment_provider_pending";
    return [provider];
  }
  return [];
}

function extractPricingModel(text: string): string {
  if (/freemium|free.?tier|free.?plan/i.test(text)) return "freemium";
  if (/usage.?based|pay.?per.?use|metered/i.test(text)) return "usage_based";
  if (/one.?time|single.?purchase|lifetime/i.test(text)) return "one_time";
  if (/subscription|monthly|annual|recurring/i.test(text)) return "subscription";
  if (/tiered|multiple.?plan/i.test(text)) return "tiered";
  return "";
}

function extractDeploymentTarget(text: string): string {
  if (/railway/i.test(text)) return "railway";
  if (/render/i.test(text)) return "render";
  if (/fly\.io|flyio/i.test(text)) return "fly";
  if (/aws|amazon.?web/i.test(text)) return "aws";
  if (/gcp|google.?cloud/i.test(text)) return "gcp";
  if (/azure/i.test(text)) return "azure";
  if (/heroku/i.test(text)) return "heroku";
  if (/vercel/i.test(text)) return "vercel";
  return "";
}

function extractDatabase(text: string): string {
  if (/mongodb|mongo/i.test(text)) return "mongodb";
  if (/mysql/i.test(text)) return "mysql";
  if (/sqlite/i.test(text)) return "sqlite";
  if (/postgres|postgresql|supabase|neon|planetscale/i.test(text)) return "postgres";
  return "";
}

function extractCompliance(text: string): string[] {
  const reqs: string[] = [];
  if (/hipaa/i.test(text)) reqs.push("hipaa");
  if (/gdpr/i.test(text)) reqs.push("gdpr");
  if (/soc.?2|soc2/i.test(text)) reqs.push("soc2");
  if (/pci.?dss|pci/i.test(text)) reqs.push("pci_dss");
  if (/ccpa/i.test(text)) reqs.push("ccpa");
  return reqs;
}

function extractNotifications(text: string): string[] {
  const notifs: string[] = [];
  if (/email/i.test(text)) notifs.push("email");
  if (/sms|twilio|text.?message/i.test(text)) notifs.push("sms");
  if (/push.?notification|mobile.?push/i.test(text)) notifs.push("push");
  if (/slack/i.test(text)) notifs.push("slack");
  if (/in.?app.?notif|notification.?bell/i.test(text)) notifs.push("in_app");
  if (notifs.length === 0) notifs.push("email");
  return notifs;
}

function extractIntegrations(text: string): string[] {
  const integs: string[] = [];
  if (/stripe/i.test(text)) integs.push("stripe");
  if (/twilio/i.test(text)) integs.push("twilio");
  if (/sendgrid/i.test(text)) integs.push("sendgrid");
  if (/resend/i.test(text)) integs.push("resend");
  if (/mailgun/i.test(text)) integs.push("mailgun");
  if (/sendgrid|resend|mailgun|ses|postmark/i.test(text) || /email/i.test(text)) {
    if (!integs.some(i => ["sendgrid","resend","mailgun"].includes(i))) integs.push("resend");
  }
  if (/salesforce/i.test(text)) integs.push("salesforce");
  if (/hubspot/i.test(text)) integs.push("hubspot");
  if (/intercom/i.test(text)) integs.push("intercom");
  if (/segment/i.test(text)) integs.push("segment");
  if (/zapier/i.test(text)) integs.push("zapier");
  if (/s3|cloudinary/i.test(text)) integs.push("s3_storage");
  if (/slack/i.test(text) && !integs.includes("slack")) integs.push("slack");
  return [...new Set(integs)];
}

function extractRoles(blueprint: { defaultRoles: string[] }, text: string): string[] {
  const roles = [...blueprint.defaultRoles];
  if (/admin/i.test(text) && !roles.includes("admin")) roles.unshift("admin");
  if (/manager/i.test(text) && !roles.includes("manager")) roles.push("manager");
  if (/staff|employee|team.?member/i.test(text) && !roles.includes("staff")) roles.push("staff");
  if (/guest|public|anonymous/i.test(text) && !roles.includes("guest")) roles.push("guest");
  return [...new Set(roles)];
}

function extractBusinessModel(text: string): string {
  if (/marketplace|platform|two.?sided/i.test(text)) return "marketplace";
  if (/saas|software.?as.?a.?service/i.test(text)) return "saas";
  if (/subscription/i.test(text)) return "subscription";
  if (/freemium/i.test(text)) return "freemium";
  if (/b2b/i.test(text)) return "b2b_saas";
  if (/b2c/i.test(text)) return "b2c";
  return "commercial_service";
}

// ── Main analyzer ─────────────────────────────────────────────────────────────

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
  projectId?: string;
}): {
  spec: MasterSpec;
  style: string;
  clarifications: ReturnType<typeof planClarifications>;
} {
  const nowActor = input.actorId || "system";
  const text = input.request;
  const style = detectChatStyle(text);
  const delegated = /(you decide|decide for me|autopilot|just build it|use your judgment)/i.test(text);

  // Extract as much as possible from free text before falling back to defaults
  const authModel       = extractAuthModel(text);
  const tenancyModel    = extractTenancyModel(text);
  const payments        = extractPayments(text);
  const pricingModel    = extractPricingModel(text);
  const deployTarget    = extractDeploymentTarget(text);
  const dbChoice        = extractDatabase(text);
  const compliance      = extractCompliance(text);
  const notifications   = extractNotifications(text);
  const integrations    = extractIntegrations(text);
  const roles           = extractRoles(input.blueprint, text);

  // Build problem/outcome from text — use first 220 chars as problem seed
  const coreProblem = text.length > 220
    ? text.slice(0, 220) + "…"
    : text;

  const baseSpec: MasterSpec = {
    appName: input.appName,
    appType: input.blueprint.category,
    targetUsers: ["admin", "operator", "end_user"],
    customerSegments: ["SMB", "Mid-market"],
    coreProblem,
    coreOutcome: "Deliver a production-grade application with validated workflows.",
    businessModel: extractBusinessModel(text),
    pricingModel,
    primaryUserJourneys: ["onboard", "complete core task", "admin review"],
    pages: input.blueprint.defaultPages,
    components: input.blueprint.defaultComponents,
    roles,
    permissions: input.blueprint.defaultPermissions,
    dataEntities: input.blueprint.defaultEntities,
    relationships: input.blueprint.defaultRelationships,
    workflows: input.blueprint.defaultWorkflows,
    stateMachines: ["draft_to_published", "pending_to_approved"],
    integrations: integrations.length > 0 ? integrations : input.blueprint.defaultIntegrations,
    payments,
    notifications,
    filesAndMedia: /upload|file|image|attachment|media/i.test(text) ? ["uploads"] : [],
    adminTools: ["audit_log", "role_admin"],
    analytics: ["usage_dashboard"],
    contentCms: ["basic_content_blocks"],
    authModel,
    tenancyModel,
    securityRequirements: ["rbac_enforced", "audit_events", "token_validation"],
    complianceRequirements: compliance,
    deploymentTarget: deployTarget || "vercel",
    envVars: buildEnvVars(authModel, payments, integrations, dbChoice),
    brandDirection: "Trustworthy and execution-focused",
    uiStyle: "Clean control-plane with dense operational clarity",
    responsiveRequirements: ["desktop", "tablet", "mobile"],
    accessibilityRequirements: ["wcag_aa", "keyboard_navigation"],
    acceptanceCriteria: input.blueprint.acceptanceCriteria,
    launchCriteria: input.blueprint.launchCriteria,
    assumptions: buildAssumptions(authModel, tenancyModel, payments, compliance, nowActor),
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
      ...(payments.length > 0 ? ["Payment architecture requires explicit confirmation"] : []),
      ...(compliance.length > 0 ? ["Compliance requirements need legal/security review"] : []),
    ],
  };

  return { spec, style, clarifications };
}

// ── Helpers ───────────────────────────────────────────────────────────────────

function buildEnvVars(authModel: string, payments: string[], integrations: string[], db: string): string[] {
  const vars = new Set(["NODE_ENV", "PORT"]);
  if (authModel.includes("oidc") || authModel.includes("sso")) {
    vars.add("OIDC_ISSUER_URL"); vars.add("OIDC_CLIENT_ID"); vars.add("OIDC_CLIENT_SECRET");
  }
  if (authModel.includes("google")) { vars.add("GOOGLE_CLIENT_ID"); vars.add("GOOGLE_CLIENT_SECRET"); }
  if (authModel.includes("github")) { vars.add("GITHUB_CLIENT_ID"); vars.add("GITHUB_CLIENT_SECRET"); }
  if (authModel === "" || authModel === "email_password") vars.add("JWT_SECRET");
  if (payments.includes("stripe")) { vars.add("STRIPE_SECRET_KEY"); vars.add("STRIPE_WEBHOOK_SECRET"); }
  if (db === "postgres" || db === "") { vars.add("DATABASE_URL"); }
  if (db === "mongodb") vars.add("MONGODB_URI");
  if (integrations.includes("sendgrid")) vars.add("SENDGRID_API_KEY");
  if (integrations.includes("resend")) vars.add("RESEND_API_KEY");
  if (integrations.includes("twilio")) { vars.add("TWILIO_ACCOUNT_SID"); vars.add("TWILIO_AUTH_TOKEN"); }
  if (integrations.includes("s3_storage")) { vars.add("AWS_ACCESS_KEY_ID"); vars.add("AWS_SECRET_ACCESS_KEY"); vars.add("AWS_S3_BUCKET"); }
  vars.add("SUPABASE_URL"); vars.add("SUPABASE_SERVICE_ROLE_KEY");
  return [...vars];
}

function buildAssumptions(
  authModel: string,
  tenancyModel: string,
  payments: string[],
  compliance: string[],
  madeBy: string
) {
  const assumptions = [];

  assumptions.push(makeAssumption({
    field: "notification provider",
    decision: "Transactional email via Resend — API key required before launch",
    reason: "Low-risk baseline for transactional workflows; easy to swap provider",
    importance: 4,
    risk: "low",
    madeBy,
  }));

  if (!authModel) {
    assumptions.push(makeAssumption({
      field: "auth/security",
      decision: "JWT-based email+password auth with RBAC role guards",
      reason: "Enterprise-safe default; can add OAuth later",
      importance: 9,
      risk: "high",
      madeBy,
    }));
  }

  if (!tenancyModel) {
    assumptions.push(makeAssumption({
      field: "tenancy",
      decision: "Single-tenant — all users share one data pool",
      reason: "Simpler to build first; multi-tenant can be added if required",
      importance: 8,
      risk: "high",
      madeBy,
    }));
  }

  if (payments.length > 0) {
    assumptions.push(makeAssumption({
      field: "payments",
      decision: "Stripe for all payment processing",
      reason: "Industry standard, best developer experience, webhooks well-supported",
      importance: 9,
      risk: "high",
      madeBy,
    }));
  }

  if (compliance.includes("gdpr")) {
    assumptions.push(makeAssumption({
      field: "gdpr_compliance",
      decision: "GDPR soft-delete + data export endpoint implemented",
      reason: "Legal requirement for EU users",
      importance: 10,
      risk: "high",
      madeBy,
    }));
  }

  assumptions.push(makeAssumption({
    field: "database",
    decision: "PostgreSQL via Supabase with Prisma ORM",
    reason: "Best relational DB for most apps; Supabase adds auth + real-time if needed later",
    importance: 7,
    risk: "low",
    madeBy,
  }));

  return assumptions;
}
