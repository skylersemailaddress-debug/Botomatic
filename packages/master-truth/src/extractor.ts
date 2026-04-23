export function extractStructuredFields(request: string) {
  const lower = request.toLowerCase();

  return {
    productIntent: request,
    users: lower.includes("admin") ? ["admin"] : [],
    roles: lower.includes("user") ? ["user"] : [],
    entities: lower.includes("dashboard") ? ["dashboard"] : [],
    workflows: lower.includes("approval") ? ["approval"] : [],
    integrations: lower.includes("stripe") ? ["stripe"] : [],
    constraints: [],
    assumptions: [],
  };
}
