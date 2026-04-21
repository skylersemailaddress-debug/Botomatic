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
  if (lower.includes("analytics")) features.add("Analytics");
  if (lower.includes("event")) features.add("Event management");
  if (lower.includes("sms") || lower.includes("message")) features.add("Messaging");
  if (lower.includes("volunteer")) features.add("Volunteer management");
  if (features.size === 0) features.add("Core workflow");
  return Array.from(features);
}

function inferRoutes(features: string[]): string[] {
  const routes = new Set<string>(["/login", "/dashboard", "/settings"]);
  if (features.includes("Volunteer management")) routes.add("/volunteers");
  if (features.includes("Event management")) routes.add("/events");
  if (features.includes("Analytics")) routes.add("/analytics");
  if (features.includes("Messaging")) routes.add("/messages");
  return Array.from(routes);
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

  return {
    projectId: input.projectId,
    appName: input.appName,
    category,
    coreValue: input.request,
    users: ["admin"],
    roles: ["admin"],
    stack: {
      frontend: "Next.js",
      backend: "Supabase",
      jobs: "Trigger.dev",
      deploy: "Vercel"
    },
    features,
    routes: inferRoutes(features),
    entities: ["users"],
    workflows: ["core_workflow"],
    integrations: ["GitHub", "Vercel", "Supabase", "Trigger.dev"],
    constraints: [
      "Autobuilder is the boss",
      "Do not redesign without approval",
      "All DB changes must be represented in code"
    ],
    assumptions: [
      "Single-organization MVP",
      "Single-tenant baseline",
      "Admin-first role model"
    ],
    acceptanceCriteria: [
      "Master truth compiles successfully",
      "Milestones and packets can be generated",
      "At least one packet can be executed"
    ],
    supportLevel: "bounded_prototype",
    requiredApprovals: ["architecture"],
    status: "awaiting_architecture_approval",
    createdAt: now,
    updatedAt: now
  };
}
