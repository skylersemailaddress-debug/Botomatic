import { MasterTruth } from "../../core-contracts/src/masterTruth";

export type IntakeMessage = {
  role: "user" | "assistant";
  content: string;
};

function inferCategory(text: string): string {
  const lower = text.toLowerCase();
  if (lower.includes("crm")) return "crm";
  if (lower.includes("booking") || lower.includes("appointment")) return "booking";
  if (lower.includes("dashboard") || lower.includes("analytics")) return "saas_dashboard";
  if (lower.includes("volunteer") || lower.includes("operations") || lower.includes("workflow")) return "workflow_system";
  return "internal_tool";
}

function inferFeatures(text: string): string[] {
  const lower = text.toLowerCase();
  const features = new Set<string>();
  if (lower.includes("login") || lower.includes("auth")) features.add("Authentication");
  if (lower.includes("dashboard")) features.add("Dashboard");
  if (lower.includes("analytics") || lower.includes("report")) features.add("Analytics");
  if (lower.includes("event") || lower.includes("scheduling") || lower.includes("appointment")) features.add("Event management");
  if (lower.includes("sms") || lower.includes("message") || lower.includes("communication")) features.add("Messaging");
  if (lower.includes("volunteer")) features.add("Volunteer management");
  if (lower.includes("portal") || lower.includes("customer")) features.add("Customer portal");
  if (lower.includes("approval") || lower.includes("governance") || lower.includes("role")) features.add("Role-based access control");
  if (lower.includes("reminder") || lower.includes("notification")) features.add("Notifications");
  if (lower.includes("workflow") || lower.includes("automation")) features.add("Workflow automation");
  if (lower.includes("audit") || lower.includes("track")) features.add("Audit trail");
  if (lower.includes("crm") || lower.includes("contact") || lower.includes("customer")) features.add("Contact management");
  if (features.size === 0) features.add("Core workflow");
  return Array.from(features);
}

function inferRoutes(features: string[]): string[] {
  const routes = new Set<string>(["/login", "/dashboard", "/settings", "/admin"]);
  if (features.includes("Volunteer management")) routes.add("/volunteers");
  if (features.includes("Event management")) routes.add("/events");
  if (features.includes("Analytics")) routes.add("/analytics");
  if (features.includes("Messaging")) routes.add("/messages");
  if (features.includes("Customer portal")) routes.add("/portal");
  if (features.includes("Contact management")) routes.add("/contacts");
  if (features.includes("Audit trail")) routes.add("/audit");
  if (features.includes("Workflow automation")) routes.add("/workflows");
  return Array.from(routes);
}

function inferRoles(text: string): string[] {
  const lower = text.toLowerCase();
  const roles = new Set<string>(["admin"]);
  if (lower.includes("role") || lower.includes("rbac") || lower.includes("permission")) {
    roles.add("reviewer");
    roles.add("operator");
    roles.add("member");
  } else if (lower.includes("volunteer") || lower.includes("portal") || lower.includes("customer")) {
    roles.add("reviewer");
    roles.add("member");
  } else {
    roles.add("reviewer");
    roles.add("operator");
  }
  return Array.from(roles);
}

function inferEntities(text: string, features: string[]): string[] {
  const entities = new Set<string>(["users", "organizations"]);
  if (features.includes("Contact management")) {
    entities.add("contacts");
    entities.add("deals");
    entities.add("companies");
  }
  if (features.includes("Event management")) {
    entities.add("events");
    entities.add("schedules");
  }
  if (features.includes("Volunteer management")) {
    entities.add("volunteers");
    entities.add("shifts");
    entities.add("assignments");
  }
  if (features.includes("Messaging")) entities.add("messages");
  if (features.includes("Notifications")) entities.add("notifications");
  if (features.includes("Audit trail")) entities.add("audit_logs");
  if (features.includes("Workflow automation")) entities.add("workflows");
  if (features.includes("Customer portal")) entities.add("customers");
  if (features.includes("Analytics")) entities.add("reports");
  // ensure at least 3 entities
  if (entities.size < 3) entities.add("records");
  return Array.from(entities);
}

function inferWorkflows(text: string, features: string[]): string[] {
  const workflows = new Set<string>(["user_onboarding", "admin_management"]);
  if (features.includes("Contact management")) {
    workflows.add("contact_lifecycle");
    workflows.add("deal_pipeline");
  }
  if (features.includes("Event management")) {
    workflows.add("event_scheduling");
    workflows.add("attendance_tracking");
  }
  if (features.includes("Volunteer management")) {
    workflows.add("volunteer_signup");
    workflows.add("shift_management");
  }
  if (features.includes("Workflow automation")) {
    workflows.add("approval_workflow");
    workflows.add("task_automation");
  }
  if (features.includes("Analytics")) workflows.add("reporting_pipeline");
  if (features.includes("Messaging")) workflows.add("notification_dispatch");
  // ensure at least 3
  if (workflows.size < 3) workflows.add("core_workflow");
  return Array.from(workflows);
}

function inferSupportLevel(text: string): "first_class" | "bounded_prototype" {
  const lower = text.toLowerCase();
  const enterpriseSignals = ["enterprise", "role", "rbac", "approval", "governance", "audit", "workflow", "automation", "analytics", "reporting", "portal"];
  const matches = enterpriseSignals.filter((s) => lower.includes(s)).length;
  return matches >= 2 ? "first_class" : "bounded_prototype";
}

function extractListAfterHeading(text: string, heading: string): string[] {
  const lower = text.toLowerCase();
  const headingIdx = lower.indexOf(heading.toLowerCase());
  if (headingIdx === -1) return [];
  const slice = text.slice(headingIdx).split("\n").slice(1, 16);
  const out: string[] = [];
  for (const line of slice) {
    const trimmed = line.trim();
    if (!trimmed) {
      if (out.length > 0) break;
      continue;
    }
    if (/^#{1,6}\s/.test(trimmed)) break;
    if (/^[-*]\s+/.test(trimmed) || /^\d+\.\s+/.test(trimmed)) {
      out.push(trimmed.replace(/^([-*]|\d+\.)\s+/, "").trim());
      continue;
    }
    if (out.length > 0) break;
  }
  return out;
}

function inferPages(text: string, features: string[]): string[] {
  const fromHeading = extractListAfterHeading(text, "pages");
  if (fromHeading.length > 0) return fromHeading;
  const pages = new Set<string>(["Dashboard", "Settings"]);
  if (features.includes("Authentication")) pages.add("Sign in");
  if (features.includes("Contact management")) pages.add("Contacts");
  if (features.includes("Event management")) pages.add("Events");
  if (features.includes("Analytics")) pages.add("Analytics");
  if (features.includes("Messaging")) pages.add("Messages");
  if (features.includes("Audit trail")) pages.add("Audit log");
  return Array.from(pages);
}

function inferCanonicalSpec(input: { request: string; features: string[]; users: string[]; workflows: string[]; entities: string[]; integrations: string[]; acceptanceCriteria: string[]; }): NonNullable<MasterTruth["canonicalSpec"]> {
  const { request, features, users, workflows, entities, integrations, acceptanceCriteria } = input;
  const productIntent = extractListAfterHeading(request, "product intent")[0] || request.split("\n")[0].trim() || "Deliver the requested app outcome with execution-grade reliability.";
  const usersFromHeading = extractListAfterHeading(request, "users");
  const workflowsFromHeading = extractListAfterHeading(request, "workflows");
  const dataModelFromHeading = extractListAfterHeading(request, "data model");
  const integrationsFromHeading = extractListAfterHeading(request, "integrations");
  const acceptanceFromHeading = extractListAfterHeading(request, "acceptance criteria");
  const openQuestions = extractListAfterHeading(request, "open questions");

  const detectedQuestions = request
    .split("\n")
    .map((line) => line.trim())
    .filter((line) => line.includes("?") && line.length > 3)
    .slice(0, 10);

  return {
    productIntent,
    users: usersFromHeading.length > 0 ? usersFromHeading : users,
    pages: inferPages(request, features),
    workflows: workflowsFromHeading.length > 0 ? workflowsFromHeading : workflows,
    dataModel: dataModelFromHeading.length > 0 ? dataModelFromHeading : entities,
    integrations: integrationsFromHeading.length > 0 ? integrationsFromHeading : integrations,
    acceptanceCriteria: acceptanceFromHeading.length > 0 ? acceptanceFromHeading : acceptanceCriteria,
    openQuestions: openQuestions.length > 0 ? openQuestions : (detectedQuestions.length > 0 ? detectedQuestions : ["What production SLA and launch date are required?"]),
  };
}

export function compileConversationToMasterTruth(input: {
  projectId: string;
  appName: string;
  request: string;
  messages?: IntakeMessage[];
}): MasterTruth {
  const now = new Date().toISOString();
  const features = inferFeatures(input.request);
  const category = inferCategory(input.request);
  const roles = inferRoles(input.request);
  const entities = inferEntities(input.request, features);
  const workflows = inferWorkflows(input.request, features);
  const supportLevel = inferSupportLevel(input.request);
  const integrations = ["GitHub", "Vercel", "Supabase", "Trigger.dev"];
  const acceptanceCriteria = [
    "Master truth compiles successfully",
    "Milestones and packets can be generated",
    "At least one packet can be executed",
    "Role enforcement is validated in integration tests",
    "All workflows have at least one acceptance test"
  ];
  const canonicalSpec = inferCanonicalSpec({
    request: input.request,
    features,
    users: ["admin", "operator", "end_user"],
    workflows,
    entities,
    integrations,
    acceptanceCriteria,
  });

  return {
    projectId: input.projectId,
    appName: input.appName,
    category,
    coreValue: input.request,
    users: ["admin", "operator", "end_user"],
    roles,
    stack: {
      frontend: "Next.js",
      backend: "Supabase",
      jobs: "Trigger.dev",
      deploy: "Vercel"
    },
    features,
    routes: inferRoutes(features),
    entities,
    workflows,
    integrations,
    constraints: [
      "Autobuilder is the boss",
      "Do not redesign without approval",
      "All DB changes must be represented in code",
      "Role-based access must be enforced at API boundary",
      "Audit events must be emitted for all state mutations"
    ],
    assumptions: [
      "Single-organization MVP",
      "Single-tenant baseline",
      "Admin-first role model",
      "Feature flags control progressive rollout"
    ],
    acceptanceCriteria,
    canonicalSpec,
    supportLevel,
    requiredApprovals: ["architecture", "security"],
    status: "awaiting_architecture_approval",
    createdAt: now,
    updatedAt: now
  };
}
