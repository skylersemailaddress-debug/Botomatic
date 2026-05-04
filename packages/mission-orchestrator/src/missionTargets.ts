export type MissionTargetType =
  | "single_page_app"
  | "full_stack_app"
  | "enterprise_monorepo"
  | "multi_service_system"
  | "api_service"
  | "admin_console"
  | "workflow_platform"
  | "repair_existing_repo"
  | "integration_platform";

export interface TargetFolderLayout {
  directories: string[];
  requiredScripts: string[];
  description: string;
}

export const TARGET_LAYOUTS: Record<MissionTargetType, TargetFolderLayout> = {
  single_page_app: {
    directories: ["src/", "public/", "src/components/", "src/pages/"],
    requiredScripts: ["dev", "build", "lint"],
    description: "Single-page React/Next.js application",
  },
  full_stack_app: {
    directories: ["apps/web/", "apps/api/", "packages/", "packages/shared/"],
    requiredScripts: ["dev", "build", "test"],
    description: "Full-stack application with frontend and backend",
  },
  enterprise_monorepo: {
    directories: [
      "apps/",
      "apps/api/",
      "apps/web/",
      "apps/worker/",
      "packages/",
      "packages/core/",
      "packages/runtime/",
      "packages/validation/",
      "packages/governance/",
      "packages/observability/",
      "contracts/",
      "validators/",
      "evidence/",
      "docs/",
    ],
    requiredScripts: ["build", "test", "validate:all", "lint"],
    description: "Enterprise-grade monorepo with full subsystem separation",
  },
  multi_service_system: {
    directories: [
      "apps/",
      "apps/api/",
      "apps/web/",
      "apps/worker/",
      "packages/",
      "packages/core/",
      "packages/runtime/",
      "packages/validation/",
      "packages/governance/",
      "packages/observability/",
      "contracts/",
      "validators/",
      "evidence/",
      "docs/",
    ],
    requiredScripts: ["build", "test", "validate:all", "lint"],
    description: "Multi-service system with independent deployable services",
  },
  api_service: {
    directories: ["src/", "src/routes/", "src/middleware/", "src/models/", "migrations/"],
    requiredScripts: ["dev", "build", "test"],
    description: "Standalone REST/GraphQL API service",
  },
  admin_console: {
    directories: ["src/", "src/components/", "src/pages/", "src/api/"],
    requiredScripts: ["dev", "build"],
    description: "Administrative control plane UI",
  },
  workflow_platform: {
    directories: ["apps/", "packages/workflow-engine/", "packages/execution/", "packages/triggers/"],
    requiredScripts: ["build", "test", "dev"],
    description: "Event-driven workflow orchestration platform",
  },
  repair_existing_repo: {
    directories: ["patches/", "diagnostics/", "rollback/"],
    requiredScripts: ["diagnose", "repair", "validate"],
    description: "Repair and patch operations on an existing repository",
  },
  integration_platform: {
    directories: ["apps/", "packages/adapters/", "packages/connectors/", "packages/webhooks/"],
    requiredScripts: ["build", "test", "dev"],
    description: "Integration hub with adapter and connector registry",
  },
};

export function detectTargetArchitecture(specText: string): MissionTargetType {
  const lower = specText.toLowerCase();
  if (/monorepo|enterprise\s+platform|multi[\s-]service|distributed\s+system|multi[\s-]tenant\s+enterprise/.test(lower)) {
    if (/multi[\s-]service|distributed|microservice/.test(lower)) return "multi_service_system";
    return "enterprise_monorepo";
  }
  if (/marketplace|vendor\s+platform|multi[\s-]sided|buyer.*seller/.test(lower)) return "workflow_platform";
  if (/workflow|automation|pipeline|job\s+queue|trigger|event[\s-]driven/.test(lower)) return "workflow_platform";
  if (/integration\s+platform|connector|webhook|sync\s+platform/.test(lower)) return "integration_platform";
  if (/admin\s+panel|admin\s+console|back[\s-]office|control\s+plane/.test(lower)) return "admin_console";
  if (/api[\s-]only|rest\s+api|graphql\s+api|microservice/.test(lower)) return "api_service";
  if (/repair|patch\s+existing|fix\s+repo|existing\s+codebase/.test(lower)) return "repair_existing_repo";
  if (/full[\s-]stack|fullstack|web\s+app|saas|platform/.test(lower)) return "full_stack_app";
  return "single_page_app";
}

export function detectProductType(specText: string): string {
  const lower = specText.toLowerCase();
  // More-specific signals checked before broad catch-alls
  if (/marketplace/.test(lower)) return "marketplace";
  if (/crm|customer\s+relationship/.test(lower)) return "crm";
  if (/ecommerce|e-commerce|shop|store/.test(lower)) return "ecommerce";
  if (/lms|learning\s+management|e-learning/.test(lower)) return "lms";
  if (/ai\s+platform|llm|chat|assistant|agent/.test(lower)) return "ai_platform";
  // SaaS before analytics — a SaaS HR platform has "reporting" but is still SaaS
  if (/saas|subscription\s+service|multi[- ]tenant\s+saas|saas_platform/.test(lower)) return "saas_platform";
  if (/\bhr\b|payroll|human\s+resources|employee\s+management/.test(lower)) return "saas_platform";
  if (/workflow|automation/.test(lower)) return "workflow_platform";
  if (/analytics|reporting\s+dashboard|bi\s+platform/.test(lower)) return "analytics_platform";
  if (/enterprise|internal\s+tool|back[\s-]office/.test(lower)) return "enterprise_platform";
  if (/integration|connector|api\s+gateway/.test(lower)) return "integration_platform";
  return "general_app";
}
