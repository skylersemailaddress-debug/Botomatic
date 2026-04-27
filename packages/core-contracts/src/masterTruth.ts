export type SupportLevel = "first_class" | "bounded_prototype" | "structural_only" | "future";

export type ProjectStatus =
  | "intake"
  | "clarifying"
  | "compiling_truth"
  | "awaiting_architecture_approval"
  | "planning"
  | "queued"
  | "executing"
  | "validating"
  | "repairing"
  | "preview_ready"
  | "awaiting_release_approval"
  | "released"
  | "blocked";

export interface MasterTruth {
  projectId: string;
  appName: string;
  category: string;
  coreValue: string;
  users: string[];
  roles: string[];
  stack: {
    frontend: string;
    backend: string;
    jobs?: string;
    deploy?: string;
  };
  features: string[];
  routes: string[];
  entities: string[];
  workflows: string[];
  integrations: string[];
  constraints: string[];
  assumptions: string[];
  acceptanceCriteria: string[];
  canonicalSpec?: {
    productIntent: string;
    users: string[];
    pages: string[];
    workflows: string[];
    dataModel: string[];
    integrations: string[];
    acceptanceCriteria: string[];
    openQuestions: string[];
  };
  supportLevel: SupportLevel;
  requiredApprovals: string[];
  status: ProjectStatus;
  createdAt: string;
  updatedAt: string;
}
