// ── Canonical Spec Completeness Contract ──────────────────────────────────────
// This is the single source of truth for all readiness/spec-completeness types.
// Used by: spec-engine, orchestrator-api, and mirrored in control-plane/src/types/readiness.ts
// Do not introduce duplicate incompatible types elsewhere.

export type UserMode = "simple" | "technical" | "mixed";

export type QuestionSeverity = "blocking" | "recommended" | "optional";

export type QuestionKind =
  | "product"
  | "users"
  | "workflow"
  | "data"
  | "auth"
  | "roles_permissions"
  | "security_privacy"
  | "compliance"
  | "integrations"
  | "payments"
  | "files_uploads"
  | "notifications"
  | "ai"
  | "deployment"
  | "design_brand"
  | "success_criteria"
  | "constraints"
  | "approval";

// SpecQuestion is the canonical blocking/clarifying question type.
// All required fields match the BetaHQ BlockingQuestion contract.
// Extra optional fields extend it for advanced use.
export type SpecQuestion = {
  // Required — must match BetaHQ BlockingQuestion exactly
  id: string;
  field: string;
  question: string;
  plainEnglish: string;
  risk: string;
  suggestedDefault: string | null;
  // Extended — optional enrichment
  kind?: QuestionKind;
  severity?: QuestionSeverity;
  technicalDetail?: string;
  whyItMatters?: string;
  options?: string[];
  answer?: string;
  answered?: boolean;
  defaultApproved?: boolean;
};

export type RecommendedDefault = {
  id: string;
  field: string;
  value: string;
  plainEnglish: string;
  technicalDetail: string;
  risk: "low" | "medium" | "high";
  requiresApproval: boolean;
  approved: boolean;
};

export type Assumption = {
  id: string;
  field: string;
  value: string;
  reason: string;
  risk: "low" | "medium" | "high";
  source: "user" | "inferred" | "recommended_default";
  approved: boolean;
};

// SpecCompletenessResult is the canonical readiness response type.
// Used by Express routes, Next routes, operator service, and BetaHQ.
export type SpecCompletenessResult = {
  projectId: string;
  readyToBuild: boolean;
  readinessScore: number;
  status: "intake" | "clarifying" | "ready_to_build" | "build_locked";
  lockedReason: string | null;
  blockingQuestions: SpecQuestion[];
  missingArtifacts: string[];
  canUseRecommendedDefaults: boolean;
  // Extended — optional enrichment
  userMode?: UserMode;
  appCategory?: string;
  requiredDecisions?: unknown[];
  recommendedDefaults?: unknown[];
  inferredDefaults?: unknown[];
  acceptedDefaults?: unknown[];
  buildContractId?: string | null;
  advancedSections?: Record<string, unknown>;
  nextAction?: string;
};
