import { registerBlueprint } from "./registry";

export function seedCoreBlueprints() {
  registerBlueprint({
    id: "crm_core",
    name: "CRM Core",
    description: "Contacts, accounts, pipeline, follow-up workflows",
    requiredEntities: ["member"],
    requiredWorkflows: ["reporting_flow"],
    modules: ["rbac", "audit", "notifications"],
  });

  registerBlueprint({
    id: "ops_dashboard",
    name: "Ops Dashboard",
    description: "Operational dashboards, alerts, assignment workflows",
    requiredEntities: ["dashboard", "task"],
    requiredWorkflows: ["assignment_flow", "notification_flow"],
    modules: ["rbac", "audit", "workflow"],
  });

  registerBlueprint({
    id: "approval_system",
    name: "Approval System",
    description: "Approval queues and decision workflows",
    requiredEntities: ["approval"],
    requiredWorkflows: ["approval_flow"],
    modules: ["workflow", "notifications", "audit"],
  });
}
