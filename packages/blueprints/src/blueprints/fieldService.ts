import { Blueprint } from "../types";

export const fieldService: Blueprint = {
  id: "field_service",
  name: "fieldService",
  category: "operations",
  description: "Commercial fieldService blueprint with production defaults and no-placeholder policy.",
  defaultPages: ["Home", "Dashboard", "Settings", "Admin"],
  defaultComponents: ["Nav", "DataTable", "Form", "EmptyState", "ErrorState", "LoadingState"],
  defaultRoles: ["admin", "reviewer", "operator", "member"],
  defaultPermissions: ["read", "write", "approve", "deploy"],
  defaultEntities: ["users", "organizations", "records"],
  defaultRelationships: ["organizations has_many users", "users has_many records"],
  defaultWorkflows: ["onboarding", "core_task_execution", "approval_and_audit"],
  defaultIntegrations: ["OIDC", "Email", "Storage", "Analytics"],
  requiredQuestions: [
    "Which auth provider is required for production?",
    "What are the irreversible business rules?",
    "What compliance obligations apply?"
  ],
  safeAssumptions: [
    "Responsive web-first UX",
    "Accessibility minimum WCAG AA",
    "Admin audit trail enabled"
  ],
  riskyAssumptions: [
    "Payment processor selection",
    "Data retention/deletion policy",
    "Public/private visibility policy"
  ],
  recommendedStack: {
    frontend: "Next.js",
    backend: "Node + Durable Store",
    jobs: "Queue Worker",
    deploy: "Vercel",
  },
  acceptanceCriteria: [
    "Core journeys implemented end-to-end",
    "Role guards enforced",
    "No placeholder production flows"
  ],
  launchCriteria: [
    "Build and validation pass",
    "Security and compliance checks pass",
    "No critical blockers remain"
  ],
  validationRules: [
    "validateAuthRbac",
    "validateWorkflows",
    "validateNoPlaceholders",
    "validateCommercialReadiness"
  ],
  noPlaceholderRules: [
    "No TODO/FIXME in production workflows",
    "No fake/mock auth in production paths",
    "No fake integration handlers"
  ],
};
