// ── Spec Completeness Engine ──────────────────────────────────────────────────
// analyzeSpecCompleteness is the canonical entry point for determining whether
// a build spec is complete enough to start a build run.
//
// It handles:
//   - Artifact reference detection (attached/uploaded file language)
//   - User mode detection (simple / technical / mixed)
//   - Blocking question generation
//   - Readiness scoring

import { detectChatStyle } from "./chatStyleDetector";
import {
  UserMode,
  SpecQuestion,
  SpecCompletenessResult,
  QuestionKind,
} from "./specCompletenessContract";

const ARTIFACT_REF_RE =
  /\b(attached|attachment|the files?|my files?|uploaded files?|attached files?|this file|include the file|the attached|from the file|this pdf|this zip)\b/i;

const SIMPLE_RE =
  /\b(build me|make me|i want|i need|something that|an app that|a website|a tool)\b/i;

const TECHNICAL_RE =
  /\b(oidc|sso|rbac|jwt|oauth|saml|postgresql|prisma|multi.tenant|b2b|saas|soc2|hipaa|gdpr|audit.log|webhook|microservice|kubernetes|terraform|ci\/cd|api.gateway|rate.limit|idempotent|eventual.consistency|cqrs|event.sourcing)\b/i;

function detectUserMode(text: string): UserMode {
  const lower = text.toLowerCase();
  const isTechnical = TECHNICAL_RE.test(lower);
  const isSimple = SIMPLE_RE.test(lower) && text.length < 600;
  if (isTechnical && !isSimple) return "technical";
  if (isSimple && !isTechnical) return "simple";
  return "mixed";
}

// Required question matrix — minimal set for simple descriptions
function buildBlockingQuestionsFromText(text: string, userMode: UserMode): SpecQuestion[] {
  const lower = text.toLowerCase();
  const qs: SpecQuestion[] = [];

  const mentionsPurpose = text.length > 40 && !/^build me an app$/i.test(text.trim());
  if (!mentionsPurpose) {
    qs.push({
      id: "q_purpose",
      field: "purpose",
      kind: "product" as QuestionKind,
      severity: "blocking",
      question: "What is the core problem this app solves and who experiences it?",
      plainEnglish: "What does the app do, and who will use it?",
      technicalDetail: "Define the value proposition, ICP, and primary problem statement.",
      whyItMatters: "The build engine needs a clear goal to generate a correct spec.",
      risk: "high",
      suggestedDefault: null,
      answered: false,
      defaultApproved: false,
    });
  }

  const mentionsUsers = /\b(user|customer|client|admin|member|staff|student|teacher|patient|doctor|buyer|seller)\b/i.test(lower);
  if (!mentionsUsers && userMode === "simple") {
    qs.push({
      id: "q_users",
      field: "target_users",
      kind: "users" as QuestionKind,
      severity: "blocking",
      question: "Who are the primary users of this app?",
      plainEnglish: "Who will use the app day-to-day?",
      technicalDetail: "Identify user personas, roles, and customer segments.",
      whyItMatters: "User roles determine auth model, permissions, and data access patterns.",
      risk: "high",
      suggestedDefault: null,
      answered: false,
      defaultApproved: false,
    });
  }

  const mentionsAuth = /\b(login|sign.?in|auth|account|password|sso|oauth|oidc|jwt)\b/i.test(lower);
  if (!mentionsAuth) {
    const simple = "Should people need to create accounts to use the app?";
    const technical = "What authentication model is required: passwordless, OAuth/OIDC, SSO, custom JWT, or anonymous?";
    qs.push({
      id: "q_auth",
      field: "auth_model",
      kind: "auth" as QuestionKind,
      severity: "blocking",
      question: technical,
      plainEnglish: simple,
      technicalDetail: "Auth model determines session management, token validation, and route guards.",
      whyItMatters: "Wrong auth model causes security gaps or UX breakage.",
      risk: "high",
      suggestedDefault: "Email/password with session management (safe default)",
      answered: false,
      defaultApproved: false,
    });
  }

  const mentionsDeployment = /\b(railway|vercel|aws|gcp|azure|heroku|deploy|production|hosting)\b/i.test(lower);
  if (!mentionsDeployment) {
    qs.push({
      id: "q_deployment",
      field: "deployment_target",
      kind: "deployment" as QuestionKind,
      severity: "recommended",
      question: "What is the production deployment target?",
      plainEnglish: "Where should the app be hosted?",
      technicalDetail: "Deployment target affects build artifacts, env vars, and CI/CD pipeline.",
      whyItMatters: "Build output varies by platform.",
      risk: "medium",
      suggestedDefault: "Railway (default commercial deployment)",
      answered: false,
      defaultApproved: false,
    });
  }

  const mentionsPayments = /\b(payment|billing|stripe|subscription|checkout|paid|price)\b/i.test(lower);
  if (mentionsPayments) {
    const mentionsPaymentDetail = /\b(stripe|braintree|paypal|provider|monthly|annual|tier|plan)\b/i.test(lower);
    if (!mentionsPaymentDetail) {
      qs.push({
        id: "q_payments",
        field: "payment_model",
        kind: "payments" as QuestionKind,
        severity: "blocking",
        question: "Which payment provider and pricing model should be used?",
        plainEnglish: "Should users pay? If so, how — monthly, one-time, or by usage?",
        technicalDetail: "Payment provider, pricing tiers, billing cadence, refund/dispute handling.",
        whyItMatters: "Payment mistakes are hard to reverse and high-impact.",
        risk: "high",
        suggestedDefault: null,
        answered: false,
        defaultApproved: false,
      });
    }
  }

  const mentionsCompliance = /\b(hipaa|gdpr|coppa|pci|soc2|ferpa|ccpa|compliance|regulation|audit)\b/i.test(lower);
  if (mentionsCompliance) {
    qs.push({
      id: "q_compliance",
      field: "compliance",
      kind: "compliance" as QuestionKind,
      severity: "blocking",
      question: "Which compliance standards apply and what controls are required?",
      plainEnglish: "Are there privacy or security regulations the app must follow?",
      technicalDetail: "Compliance class determines audit logging, data residency, consent flows, and control evidence.",
      whyItMatters: "Non-compliance causes legal and financial risk.",
      risk: "high",
      suggestedDefault: null,
      answered: false,
      defaultApproved: false,
    });
  }

  // Keep the list short — max 4 blocking questions at a time
  const blocking = qs.filter((q) => q.severity === "blocking").slice(0, 4);
  const recommended = qs.filter((q) => q.severity === "recommended").slice(0, 2);
  return [...blocking, ...recommended];
}

export interface SpecCompletenessInput {
  projectId: string;
  text: string;
  artifactIds?: string[];
  hasArtifacts?: boolean;
  existingAnswers?: Record<string, { userAnswer?: string; acceptedDefault?: boolean }>;
  userMode?: UserMode;
}

export function analyzeSpecCompleteness(input: SpecCompletenessInput): SpecCompletenessResult {
  const { projectId, text, artifactIds = [], hasArtifacts = false } = input;
  const combinedArtifacts = hasArtifacts || artifactIds.length > 0;

  // 1. Artifact reference detection
  const referencesAttachment = ARTIFACT_REF_RE.test(text);
  const missingArtifacts: string[] = referencesAttachment && !combinedArtifacts
    ? ["Upload the referenced file before building, or describe your project in text instead."]
    : [];

  // 2. User mode
  const userMode: UserMode = input.userMode ?? detectUserMode(text);

  // 3. Blocking questions (skipped if artifact is missing — that's the first gate)
  const allQuestions = missingArtifacts.length > 0
    ? []
    : buildBlockingQuestionsFromText(text, userMode);

  // 4. Apply existing answers
  const answers = input.existingAnswers ?? {};
  const blockingQuestions = allQuestions.filter((q) => {
    const entry = answers[q.id];
    return !(entry?.userAnswer || entry?.acceptedDefault);
  });

  // 5. Determine status
  const readyToBuild = missingArtifacts.length === 0 && blockingQuestions.length === 0;
  let status: SpecCompletenessResult["status"];
  let lockedReason: string | null = null;

  if (missingArtifacts.length > 0) {
    status = "build_locked";
    lockedReason = "Upload the referenced file, or choose Build from description instead.";
  } else if (blockingQuestions.length > 0) {
    status = "clarifying";
    lockedReason = `${blockingQuestions.length} required question${blockingQuestions.length !== 1 ? "s" : ""} must be answered before building.`;
  } else {
    status = "ready_to_build";
  }

  // 6. Score
  const totalQ = allQuestions.length;
  const answeredCount = totalQ - blockingQuestions.length;
  const readinessScore = totalQ === 0 ? 90 : Math.round((answeredCount / Math.max(totalQ, 1)) * 80 + 10);

  const canUseRecommendedDefaults =
    blockingQuestions.length > 0 &&
    blockingQuestions.every((q) => q.suggestedDefault !== null);

  return {
    projectId,
    readyToBuild,
    readinessScore,
    status,
    lockedReason,
    blockingQuestions,
    missingArtifacts,
    canUseRecommendedDefaults,
    userMode,
  };
}
