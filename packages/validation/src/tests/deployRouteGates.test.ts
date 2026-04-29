import assert from "assert";
import { assertProviderPromoteGate, assertProviderRollbackGate } from "../../../../apps/orchestrator-api/src/deployProviderGates";

function baseHandoff(overrides: Record<string, unknown> = {}) {
  return {
    environment: "prod",
    status: "complete",
    approvalRequired: true,
    rollbackPlanPresent: true,
    smokePlanPresent: true,
    deployCommandTemplatePresent: true,
    ...overrides,
  };
}

function baseSecretLinkage(overrides: Record<string, unknown> = {}) {
  return {
    environment: "prod",
    plaintextSecretsStored: false,
    preflightRequiredBeforeDeploy: true,
    ...overrides,
  };
}

function baseRollback(overrides: Record<string, unknown> = {}) {
  return {
    environment: "prod",
    status: "complete",
    approvalRequired: true,
    rollbackCommandTemplatePresent: true,
    previousVersionReferenceRequired: true,
    dataRollbackBoundaryDocumented: true,
    ...overrides,
  };
}

function run() {
  let promote = assertProviderPromoteGate({ handoff: [], rollback: [], secretLinkage: [], source: "missing" });
  assert.equal(promote.allowed, false);
  assert(promote.reasons.some((r) => r.includes("provider handoff")));

  promote = assertProviderPromoteGate({ handoff: [baseHandoff({ approvalRequired: false })], rollback: [], secretLinkage: [baseSecretLinkage()], source: "x" });
  assert.equal(promote.allowed, false);
  assert(promote.reasons.includes("provider_handoff_approval_required_false"));

  promote = assertProviderPromoteGate({ handoff: [baseHandoff()], rollback: [], secretLinkage: [], source: "x" });
  assert.equal(promote.allowed, false);
  assert(promote.reasons.some((r) => r.includes("secret preflight linkage")));

  promote = assertProviderPromoteGate({ handoff: [baseHandoff()], rollback: [], secretLinkage: [baseSecretLinkage({ plaintextSecretsStored: true })], source: "x" });
  assert.equal(promote.allowed, false);
  assert(promote.reasons.includes("provider_secret_linkage_plaintext_secrets_forbidden"));

  promote = assertProviderPromoteGate({ handoff: [baseHandoff({ status: "blocked" })], rollback: [], secretLinkage: [baseSecretLinkage()], source: "x" });
  assert.equal(promote.allowed, true);
  assert.equal(promote.mode, "planning_only");

  let rollback = assertProviderRollbackGate({ handoff: [], rollback: [], secretLinkage: [], source: "missing" });
  assert.equal(rollback.allowed, false);
  assert(rollback.reasons.some((r) => r.includes("rollback completeness evidence")));

  rollback = assertProviderRollbackGate({ handoff: [], rollback: [baseRollback({ approvalRequired: false })], secretLinkage: [], source: "x" });
  assert.equal(rollback.allowed, false);
  assert(rollback.reasons.includes("provider_rollback_approval_required_false"));

  rollback = assertProviderRollbackGate({ handoff: [], rollback: [baseRollback({ previousVersionReferenceRequired: false })], secretLinkage: [], source: "x" });
  assert.equal(rollback.allowed, false);
  assert(rollback.reasons.includes("provider_rollback_previous_version_reference_required_false"));

  rollback = assertProviderRollbackGate({ handoff: [], rollback: [baseRollback({ status: "blocked" })], secretLinkage: [], source: "x" });
  assert.equal(rollback.allowed, true);
  assert.equal(rollback.mode, "planning_only");

  console.log("deployRouteGates.test.ts passed");
}

run();
