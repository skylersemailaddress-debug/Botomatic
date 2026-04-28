import { createProofEntry } from "../proofLedger";
import {
  classifyClaimType,
  isProofRecordValid,
  normalizeEvidenceRefs,
  requiredEvidenceClassesForClaim,
  verifyClaim,
} from "../claimVerifier";

function assert(condition: boolean, message: string): void {
  if (!condition) throw new Error(message);
}

const readinessPassed = createProofEntry({
  scope: "release",
  claim: "Service readiness validated",
  evidence: [
    {
      id: "runtime-1",
      evidenceClass: "runtime_validator",
      source: "runtime",
      capturedAt: "2026-04-28T00:00:00.000Z",
      summary: "smoke checks passed",
    },
  ],
  validatorSummary: "runtime validation pass",
  outcome: "passed",
  rollbackPlan: "rollback release tag",
});
const readinessResult = verifyClaim(readinessPassed);
assert(readinessResult.recordValid, "passed readiness should be record valid");
assert(readinessResult.readinessEligible, "passed readiness with required evidence should be readiness eligible");

const blockedEntry = createProofEntry({
  ...readinessPassed,
  outcome: "blocked",
});
const blockedResult = verifyClaim(blockedEntry);
assert(blockedResult.recordValid, "blocked claims may be structurally valid records");
assert(!blockedResult.readinessEligible, "blocked claims are not readiness eligible");

const failedEntry = createProofEntry({
  ...readinessPassed,
  outcome: "failed",
});
const failedResult = verifyClaim(failedEntry);
assert(failedResult.recordValid, "failed claims may be structurally valid records");
assert(!failedResult.readinessEligible, "failed claims are not readiness eligible");

const missingEvidence = createProofEntry({
  ...readinessPassed,
  evidence: [],
});
const missingResult = verifyClaim(missingEvidence);
assert(!missingResult.readinessEligible, "missing evidence must not be readiness eligible");
assert(missingResult.errors.length > 0, "missing evidence should surface errors");

const liveWithoutEvidence = createProofEntry({
  scope: "release",
  claim: "Live deployment completed",
  claimType: "live_deployment_claim",
  evidence: [
    {
      id: "doc-1",
      evidenceClass: "documentation",
      source: "manual",
      summary: "operator note",
    },
  ],
  validatorSummary: "post-check",
  outcome: "passed",
  rollbackPlan: "rollback deploy",
});
const liveResult = verifyClaim(liveWithoutEvidence);
assert(!liveResult.readinessEligible, "live claim without live execution evidence is not readiness eligible");

const selfUpgradeWithoutContract = createProofEntry({
  scope: "self_upgrade",
  claim: "Self-upgrade safety validated",
  claimType: "self_upgrade_claim",
  evidence: [
    {
      id: "rt-1",
      evidenceClass: "runtime_validator",
      source: "runtime",
      capturedAt: "2026-04-28T00:00:00.000Z",
    },
  ],
  validatorSummary: "self-upgrade checks pass",
  outcome: "passed",
  rollbackPlan: "rollback commit",
});
const selfUpgradeResult = verifyClaim(selfUpgradeWithoutContract);
assert(!selfUpgradeResult.readinessEligible, "self-upgrade claims require safety contract evidence or SELF-001 metadata");

const staleEvidenceResult = verifyClaim(readinessPassed, {
  now: "2026-04-29T00:00:00.000Z",
  maxEvidenceAgeMs: 1,
});
assert(!staleEvidenceResult.readinessEligible, "stale evidence should fail readiness eligibility");

const legacyEvidenceEntry = createProofEntry({
  scope: "release",
  claim: "Live deployment completed",
  claimType: "live_deployment_claim",
  evidence: ["legacy note"],
  validatorSummary: "legacy path",
  outcome: "passed",
  rollbackPlan: "legacy rollback",
});
const normalizedLegacy = normalizeEvidenceRefs(legacyEvidenceEntry);
assert(normalizedLegacy[0].evidenceClass === "documentation", "legacy evidence maps to documentation");
const legacyResult = verifyClaim(legacyEvidenceEntry);
assert(!legacyResult.readinessEligible, "legacy documentation evidence is insufficient for live deployment claims");

assert(classifyClaimType(readinessPassed) === "readiness_claim", "classifyClaimType should infer readiness claims");
assert(requiredEvidenceClassesForClaim("live_deployment_claim")[0] === "live_deployment_execution", "live claims should require live deployment evidence class");
assert(isProofRecordValid(readinessResult), "isProofRecordValid should accept verification results");
assert(isProofRecordValid(readinessPassed), "isProofRecordValid should accept ledger entries");

console.log("claimVerifier.test.ts passed");

const selfUpgradeWithUnsafeMetadata = createProofEntry({
  scope: "self_upgrade",
  claim: "Self-upgrade readiness",
  claimType: "self_upgrade_claim",
  evidence: [
    {
      id: "doc-su-1",
      evidenceClass: "documentation",
      source: "manual",
      summary: "manual note",
    },
  ],
  selfUpgradeSafety: {
    mode: "pr_only",
    targetMainBlocked: false,
    regressionMetadataFromCommandEvidence: true,
    driftChecksEnabled: true,
  },
  validatorSummary: "self-upgrade metadata review",
  outcome: "passed",
  rollbackPlan: "rollback",
});
const unsafeMetadataResult = verifyClaim(selfUpgradeWithUnsafeMetadata);
assert(!unsafeMetadataResult.readinessEligible, "unsafe SELF-001 metadata should not be readiness eligible");
assert(
  unsafeMetadataResult.errors.includes("SELF-001 metadata is unsafe for readiness eligibility."),
  "unsafe SELF-001 metadata should produce an explicit error",
);

const selfUpgradeWithPositiveMetadata = createProofEntry({
  scope: "self_upgrade",
  claim: "Self-upgrade readiness",
  claimType: "self_upgrade_claim",
  evidence: [
    {
      id: "doc-su-2",
      evidenceClass: "documentation",
      source: "manual",
      summary: "manual note",
    },
  ],
  selfUpgradeSafety: {
    mode: "pr_only",
    targetMainBlocked: true,
    regressionMetadataFromCommandEvidence: true,
    driftChecksEnabled: true,
  },
  validatorSummary: "self-upgrade metadata review",
  outcome: "passed",
  rollbackPlan: "rollback",
});
const positiveMetadataResult = verifyClaim(selfUpgradeWithPositiveMetadata);
assert(positiveMetadataResult.recordValid, "positive SELF-001 metadata should satisfy self-upgrade evidence requirement");
assert(positiveMetadataResult.readinessEligible, "positive SELF-001 metadata should allow readiness eligibility when passed");

const invalidNowResult = verifyClaim(readinessPassed, {
  now: "not-a-date",
  maxEvidenceAgeMs: 1000,
});
assert(!invalidNowResult.readinessEligible, "invalid now must not allow readiness eligibility");
assert(
  invalidNowResult.errors.includes("Invalid freshness reference timestamp."),
  "invalid now should emit freshness reference error",
);
