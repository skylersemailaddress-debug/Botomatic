type ExtractionResult = {
  productIntent: string;
  users: string[];
  roles: string[];
  entities: string[];
  workflows: string[];
  integrations: string[];
  constraints: string[];
  assumptions: string[];
};

function unique(values: string[]): string[] {
  return Array.from(new Set(values.filter(Boolean)));
}

export function extractStructuredFieldsV2(request: string): ExtractionResult {
  const lower = request.toLowerCase();
  const users: string[] = [];
  const roles: string[] = [];
  const entities: string[] = [];
  const workflows: string[] = [];
  const integrations: string[] = [];
  const constraints: string[] = [];
  const assumptions: string[] = [];

  if (lower.includes("admin")) { users.push("admin"); roles.push("admin"); }
  if (lower.includes("staff")) { users.push("staff"); roles.push("staff"); }
  if (lower.includes("manager")) { users.push("manager"); roles.push("manager"); }
  if (lower.includes("volunteer")) { users.push("volunteer"); roles.push("volunteer"); }
  if (lower.includes("customer")) { users.push("customer"); roles.push("customer"); }

  if (lower.includes("dashboard")) entities.push("dashboard");
  if (lower.includes("ticket")) entities.push("ticket");
  if (lower.includes("task")) entities.push("task");
  if (lower.includes("approval")) entities.push("approval");
  if (lower.includes("invoice")) entities.push("invoice");
  if (lower.includes("member")) entities.push("member");
  if (lower.includes("donor")) entities.push("donor");

  if (lower.includes("approve") || lower.includes("approval")) workflows.push("approval_flow");
  if (lower.includes("assign")) workflows.push("assignment_flow");
  if (lower.includes("report")) workflows.push("reporting_flow");
  if (lower.includes("notify")) workflows.push("notification_flow");
  if (lower.includes("schedule")) workflows.push("scheduling_flow");

  if (lower.includes("stripe")) integrations.push("stripe");
  if (lower.includes("twilio")) integrations.push("twilio");
  if (lower.includes("slack")) integrations.push("slack");
  if (lower.includes("gmail") || lower.includes("email")) integrations.push("email");
  if (lower.includes("supabase")) integrations.push("supabase");

  if (lower.includes("enterprise")) constraints.push("enterprise_grade");
  if (lower.includes("audit")) constraints.push("audit_logging_required");
  if (lower.includes("role")) constraints.push("rbac_required");
  if (lower.includes("multi tenant") || lower.includes("multi-tenant")) constraints.push("multi_tenant");

  if (users.length === 0) assumptions.push("default_user_model_needed");
  if (roles.length === 0) assumptions.push("default_role_model_needed");
  if (entities.length === 0) assumptions.push("core_entities_need_definition");
  if (workflows.length === 0) assumptions.push("core_workflows_need_definition");

  return {
    productIntent: request,
    users: unique(users),
    roles: unique(roles),
    entities: unique(entities),
    workflows: unique(workflows),
    integrations: unique(integrations),
    constraints: unique(constraints),
    assumptions: unique(assumptions),
  };
}
