// ── Canonical Readiness Contract — Control-Plane Mirror ───────────────────────
// This file mirrors packages/spec-engine/src/specCompletenessContract.ts
// for use within the control-plane Next.js app (which cannot import spec-engine
// directly because it is not in the npm workspace).
//
// When updating either file, update both to keep them in sync.
// Tests and validators enforce that these stay compatible.
//
// Canonical source: packages/spec-engine/src/specCompletenessContract.ts

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

// SpecQuestion is the single canonical question type used across:
//   - BetaHQ (as BlockingQuestion alias)
//   - OperatorSendResponse.blockingQuestions
//   - Express /api/projects/:id/readiness response
//   - /api/projects/:id/build/start response
//
// Required fields match BetaHQ BlockingQuestion exactly:
//   id, field, question, plainEnglish, risk (string), suggestedDefault (string|null)
export type SpecQuestion = {
  id: string;
  field: string;
  question: string;
  plainEnglish: string;
  risk: string;
  suggestedDefault: string | null;
  // Optional extended fields
  kind?: QuestionKind;
  severity?: QuestionSeverity;
  technicalDetail?: string;
  whyItMatters?: string;
  options?: string[];
  answer?: string;
  answered?: boolean;
  defaultApproved?: boolean;
};

// SpecCompletenessResult is the canonical response shape for all readiness checks.
export type SpecCompletenessResult = {
  readyToBuild?: boolean;
  readinessScore?: number;
  status?: string;
  lockedReason?: string | null;
  blockingQuestions?: SpecQuestion[];
  missingArtifacts?: string[];
  canUseRecommendedDefaults?: boolean;
  userMode?: UserMode;
  appCategory?: string;
};
