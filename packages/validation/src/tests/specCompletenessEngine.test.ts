/**
 * specCompletenessEngine.test.ts
 *
 * Tests the canonical Spec Completeness Engine and canonical contract types.
 * Covers: simple user flow, technical user flow, missing attachment flow,
 * approve-defaults flow, contract type consistency, and route bypass prevention.
 */
import assert from "node:assert";
import { analyzeSpecCompleteness } from "../../../../packages/spec-engine/src/specCompletenessEngine";
import type { SpecQuestion, SpecCompletenessResult } from "../../../../packages/spec-engine/src/specCompletenessContract";

// ── A. Contract type sanity ──────────────────────────────────────────────────

function testCanonicalContractTypes() {
  // SpecQuestion must have all BetaHQ BlockingQuestion required fields
  const q: SpecQuestion = {
    id: "q_test",
    field: "auth_model",
    question: "What auth model?",
    plainEnglish: "Should users log in?",
    risk: "high",
    suggestedDefault: null,
  };
  assert.ok(q.id && q.field && q.question && q.plainEnglish && "risk" in q && "suggestedDefault" in q,
    "SpecQuestion must have all 6 required fields matching BetaHQ BlockingQuestion");

  // risk must be string (assignable from union literals)
  const riskValue: string = q.risk;
  assert.ok(typeof riskValue === "string", "risk must be string");

  // suggestedDefault must be string | null
  const sd: string | null = q.suggestedDefault;
  assert.ok(sd === null || typeof sd === "string", "suggestedDefault must be string | null");

  console.log("  ✓ canonical contract types");
}

// ── B. Simple user flow ──────────────────────────────────────────────────────

function testSimpleUserFlow() {
  const result = analyzeSpecCompleteness({
    projectId: "proj_test_simple",
    text: "build me a chess coach app",
    artifactIds: [],
    hasArtifacts: false,
  });

  assert.ok(result.userMode === "simple" || result.userMode === "mixed",
    `simple request should yield simple or mixed userMode, got: ${result.userMode}`);
  assert.strictEqual(result.readyToBuild, false,
    "vague simple request must not be ready to build");
  assert.ok(result.blockingQuestions.length > 0,
    "simple request must produce blocking questions");
  assert.ok(result.missingArtifacts.length === 0,
    "no artifact reference = no missing artifacts");
  // All questions must have required fields
  for (const q of result.blockingQuestions) {
    assert.ok(q.id && q.field && q.question && q.plainEnglish,
      `blocking question missing required fields: ${JSON.stringify(q)}`);
    assert.ok(typeof q.risk === "string", "risk must be string");
    assert.ok("suggestedDefault" in q, "suggestedDefault must be present");
    // plainEnglish should exist and not be technical jargon for simple mode
    assert.ok(q.plainEnglish.length > 0, "plainEnglish must be non-empty");
  }
  console.log("  ✓ simple user flow");
}

// ── C. Technical user flow ───────────────────────────────────────────────────

function testTechnicalUserFlow() {
  const result = analyzeSpecCompleteness({
    projectId: "proj_test_technical",
    text: "Build a multi-tenant B2B SaaS with OIDC SSO, RBAC, audit logs, Postgres, Stripe billing, webhook integrations, and SOC2-ready controls.",
    artifactIds: [],
    hasArtifacts: false,
  });

  assert.strictEqual(result.userMode, "technical",
    "enterprise spec should yield technical userMode");
  // Technical user provides auth (OIDC SSO) — so auth question should not appear
  const authQuestion = result.blockingQuestions.find((q) => q.field === "auth_model");
  assert.ok(!authQuestion,
    "auth question should not appear when user specified OIDC SSO");
  // Compliance (SOC2) is mentioned — compliance question should appear
  const complianceQuestion = result.blockingQuestions.find((q) => q.field === "compliance");
  assert.ok(complianceQuestion,
    "compliance question should appear when SOC2 is mentioned");
  // Stripe billing mentioned with provider detail — payment question suppressed (provider known)
  // Compliance (SOC2) mentioned — that question must still appear
  assert.ok(result.blockingQuestions.length > 0 || result.readyToBuild,
    "technical user with detailed spec should either be ready or have specific questions remaining");
  console.log("  ✓ technical user flow");
}

// ── D. Missing attachment flow ───────────────────────────────────────────────

function testMissingAttachmentFlow() {
  const result = analyzeSpecCompleteness({
    projectId: "proj_test_attachment",
    text: "build the attached files",
    artifactIds: [],
    hasArtifacts: false,
  });

  assert.strictEqual(result.readyToBuild, false,
    "must not be ready to build when attachment is referenced but missing");
  assert.ok(result.missingArtifacts.length > 0,
    "missingArtifacts must be non-empty when attachment referenced but absent");
  assert.ok(result.status === "build_locked",
    `status must be build_locked, got: ${result.status}`);
  // No blocking questions when artifact is the primary issue
  assert.strictEqual(result.blockingQuestions.length, 0,
    "no blocking questions when artifact is missing (artifact is the first gate)");
  console.log("  ✓ missing attachment flow");
}

function testMissingAttachmentVariants() {
  const phrases = [
    "build from the uploaded file",
    "use the attachment I sent",
    "this pdf has the requirements",
    "build from this zip",
    "my files describe the project",
  ];
  for (const text of phrases) {
    const r = analyzeSpecCompleteness({ projectId: "p", text, hasArtifacts: false });
    assert.strictEqual(r.readyToBuild, false,
      `"${text}" should trigger build_locked`);
    assert.ok(r.missingArtifacts.length > 0,
      `"${text}" should populate missingArtifacts`);
  }
  // With artifacts present, no block
  const withArtifact = analyzeSpecCompleteness({
    projectId: "p",
    text: "build from the attached file",
    hasArtifacts: true,
  });
  assert.ok(withArtifact.missingArtifacts.length === 0,
    "artifact present: missingArtifacts should be empty");
  console.log("  ✓ attachment phrase variants");
}

// ── E. Approve defaults flow ─────────────────────────────────────────────────

function testApproveDefaultsFlow() {
  const result = analyzeSpecCompleteness({
    projectId: "proj_test_defaults",
    text: "build a project management app with teams",
    artifactIds: [],
    hasArtifacts: false,
    existingAnswers: {
      q_auth: { acceptedDefault: true },
      q_deployment: { acceptedDefault: true },
    },
  });

  // Auth and deployment are approved — those questions should not appear
  const authQ = result.blockingQuestions.find((q) => q.id === "q_auth");
  const deployQ = result.blockingQuestions.find((q) => q.id === "q_deployment");
  assert.ok(!authQ, "approved auth question must not appear in blocking list");
  assert.ok(!deployQ, "approved deployment question must not appear in blocking list");
  console.log("  ✓ approve defaults flow");
}

// ── F. Build/start bypass prevention (structural) ───────────────────────────

function testBypassPrevention() {
  // The engine returns readyToBuild=false for incomplete specs.
  // Express routes guard on readyToBuild before starting any build.
  // We verify that the engine correctly returns locked state for bypass keywords.
  const bypassPhrases = ["approval", "validate", "build"];
  for (const phrase of bypassPhrases) {
    const r = analyzeSpecCompleteness({
      projectId: "p",
      text: phrase,
      hasArtifacts: false,
    });
    // A one-word command with no spec context must not be ready to build
    assert.strictEqual(r.readyToBuild, false,
      `one-word bypass phrase "${phrase}" must return readyToBuild=false`);
  }
  console.log("  ✓ chat bypass prevention (readyToBuild=false for bare commands)");
}

// ── G. canUseRecommendedDefaults ─────────────────────────────────────────────

function testCanUseRecommendedDefaults() {
  const withDefaults = analyzeSpecCompleteness({
    projectId: "p",
    text: "build a simple todo app",
    hasArtifacts: false,
  });
  // canUseRecommendedDefaults is true only when ALL blocking questions have defaults
  if (withDefaults.blockingQuestions.length > 0) {
    const allHaveDefaults = withDefaults.blockingQuestions.every((q) => q.suggestedDefault !== null);
    assert.strictEqual(withDefaults.canUseRecommendedDefaults, allHaveDefaults,
      "canUseRecommendedDefaults must reflect whether all blocking questions have defaults");
  }
  console.log("  ✓ canUseRecommendedDefaults logic");
}

// ── H. Duplicate type check (structural) ────────────────────────────────────

async function testNoDuplicateIncompatibleTypes() {
  const fs = require("fs");
  const path = require("path");
  const root = path.join(process.cwd());

  const betaHQ = fs.readFileSync(
    path.join(root, "apps/control-plane/src/components/beta-hq/BetaHQ.tsx"), "utf8",
  );
  const operatorTs = fs.readFileSync(
    path.join(root, "apps/control-plane/src/services/operator.ts"), "utf8",
  );

  // BetaHQ must NOT define its own BlockingQuestion type with fields
  const hasLocalBlockingQuestionDef = /type BlockingQuestion\s*=\s*\{[^}]*id:\s*string[^}]*field:\s*string/s.test(betaHQ);
  assert.ok(!hasLocalBlockingQuestionDef,
    "BetaHQ.tsx must not define a local BlockingQuestion type with fields — use SpecQuestion from @/types/readiness");

  // BetaHQ must import SpecQuestion from canonical source
  assert.ok(betaHQ.includes("@/types/readiness"),
    "BetaHQ.tsx must import from @/types/readiness");

  // operator.ts must NOT define OperatorBlockingQuestion with incompatible optional fields
  const hasOperatorBQ = /export\s+type\s+OperatorBlockingQuestion/.test(operatorTs);
  assert.ok(!hasOperatorBQ,
    "operator.ts must not define OperatorBlockingQuestion — use SpecQuestion from @/types/readiness");

  // operator.ts must import from @/types/readiness
  assert.ok(operatorTs.includes("@/types/readiness"),
    "operator.ts must import SpecQuestion from @/types/readiness");

  console.log("  ✓ no duplicate incompatible types");
}

async function main() {
  console.log("specCompletenessEngine.test.ts");
  testCanonicalContractTypes();
  testSimpleUserFlow();
  testTechnicalUserFlow();
  testMissingAttachmentFlow();
  testMissingAttachmentVariants();
  testApproveDefaultsFlow();
  testBypassPrevention();
  testCanUseRecommendedDefaults();
  await testNoDuplicateIncompatibleTypes();
  console.log("specCompletenessEngine.test.ts passed");
}

main().catch((err) => { console.error(err); process.exit(1); });
