import fs from "fs";
import path from "path";
import type { RepoValidatorResult } from "../repoValidators";

const REQUIRED_DOMAINS = [
  "web_saas_app",
  "marketing_website",
  "api_service",
  "mobile_app",
  "bot",
  "ai_agent",
  "game",
  "dirty_repo_completion",
];

const REQUIRED_PROVIDERS = [
  "vercel_web_deploy",
  "supabase_backend_deploy",
  "github_release_handoff",
  "mobile_store_handoff",
  "bot_platform_deploy",
  "ai_agent_runtime_deploy",
  "game_distribution_handoff",
  "dirty_repo_completion_handoff",
];

const SECRET_LIKE_PATTERNS: RegExp[] = [
  /sk_live_[0-9a-zA-Z]{10,}/,
  /gh[pousr]_[0-9A-Za-z]{20,}/,
  /AKIA[0-9A-Z]{16}/,
  /xox[baprs]-[0-9A-Za-z-]{10,}/,
  /-----BEGIN (?:RSA |EC |OPENSSH )?PRIVATE KEY-----/,
  /eyJ[a-zA-Z0-9_-]{8,}\.[a-zA-Z0-9_-]{8,}\.[a-zA-Z0-9_-]{8,}/,
];

function has(root: string, rel: string): boolean {
  return fs.existsSync(path.join(root, rel));
}

function read(root: string, rel: string): string {
  return fs.readFileSync(path.join(root, rel), "utf8");
}

function result(ok: boolean, summary: string, checks: string[]): RepoValidatorResult {
  return {
    name: "Validate-Botomatic-LiveDeploymentExecutionReadiness",
    status: ok ? "passed" : "failed",
    summary,
    checks,
  };
}

function containsSecretLikeValue(obj: unknown): boolean {
  const serialized = JSON.stringify(obj);
  return SECRET_LIKE_PATTERNS.some((pattern) => pattern.test(serialized));
}

export function validateLiveDeploymentExecutionReadiness(root: string): RepoValidatorResult {
  const proofRel = "release-evidence/runtime/live_deployment_execution_readiness_proof.json";
  const checks = [proofRel];

  if (!has(root, proofRel)) {
    return result(
      false,
      "Live deployment execution readiness proof is missing. Run npm run -s proof:live-deployment-execution-readiness.",
      checks
    );
  }

  let proof: any;
  try {
    proof = JSON.parse(read(root, proofRel));
  } catch {
    return result(false, "Live deployment execution readiness proof JSON is invalid.", checks);
  }

  if (proof?.status !== "passed") return result(false, "Live deployment execution readiness proof status is not passed.", checks);
  if (proof?.liveExecutionPerformed !== false) return result(false, "Proof must assert liveExecutionPerformed=false.", checks);
  if (proof?.realProviderApisCalled !== false) return result(false, "Proof must assert realProviderApisCalled=false.", checks);
  if (proof?.realSecretsUsed !== false) return result(false, "Proof must assert realSecretsUsed=false.", checks);
  if (proof?.liveExecutionBlockedByDefault !== true) return result(false, "Proof must assert liveExecutionBlockedByDefault=true.", checks);
  if (proof?.deploymentPreflightIncludesSecrets !== true) return result(false, "Proof must assert deploymentPreflightIncludesSecrets=true.", checks);
  if (proof?.liveDeploymentBlockedWhenSecretsMissing !== true) return result(false, "Proof must assert liveDeploymentBlockedWhenSecretsMissing=true.", checks);

  const secretPreflight = proof?.secretPreflightByEnvironment;
  if (!secretPreflight || typeof secretPreflight !== "object") {
    return result(false, "Proof is missing secretPreflightByEnvironment.", checks);
  }
  if (secretPreflight?.prod?.blockedByMissingSecrets !== true) {
    return result(false, "Proof must assert prod preflight is blocked when required secrets are missing.", checks);
  }

  const domains = Array.isArray(proof?.domains) ? proof.domains : [];
  const adapters = Array.isArray(proof?.providerAdapters) ? proof.providerAdapters : [];
  const approvals = Array.isArray(proof?.approvalRequests) ? proof.approvalRequests : [];
  const bindings = Array.isArray(proof?.credentialBindings) ? proof.credentialBindings : [];
  const checklists = Array.isArray(proof?.preDeployChecklists) ? proof.preDeployChecklists : [];
  const plans = Array.isArray(proof?.executionPlans) ? proof.executionPlans : [];
  const smoke = Array.isArray(proof?.smokeTestPlans) ? proof.smokeTestPlans : [];
  const rollback = Array.isArray(proof?.rollbackPlans) ? proof.rollbackPlans : [];
  const audits = Array.isArray(proof?.auditEvents) ? proof.auditEvents : [];

  const hasAllDomains = REQUIRED_DOMAINS.every((id) => domains.some((d: any) => d?.domainId === id));
  if (!hasAllDomains) return result(false, "Proof is missing required domain rows.", checks);

  const providerIds = adapters.map((a: any) => a?.providerId);
  const hasProviderCoverage = REQUIRED_PROVIDERS.every((id) => providerIds.includes(id));
  if (!hasProviderCoverage) return result(false, "Proof provider coverage omits one or more required providers.", checks);

  const approvalByDomain = new Map(approvals.map((a: any) => [a?.domainId, a]));
  const bindingsByProvider = new Map(bindings.map((b: any) => [b?.providerId, b]));
  const checklistByDomain = new Map(checklists.map((c: any) => [c?.domainId, c]));
  const planByDomain = new Map(plans.map((p: any) => [p?.domainId, p]));
  const smokeByDomain = new Map(smoke.map((s: any) => [s?.domainId, s]));
  const rollbackByDomain = new Map(rollback.map((r: any) => [r?.domainId, r]));

  for (const domainId of REQUIRED_DOMAINS) {
    const approval = approvalByDomain.get(domainId);
    if (!approval) return result(false, `Approval request missing for ${domainId}.`, checks);
    if (approval.approvalStatus !== "not_approved") {
      return result(false, `Approval request for ${domainId} must be not_approved in this pass.`, checks);
    }
    if (approval.explicitUserApprovalRequired !== true) {
      return result(false, `Approval request for ${domainId} must require explicit user approval.`, checks);
    }

    const checklist = checklistByDomain.get(domainId);
    if (!checklist) return result(false, `Pre-deploy checklist missing for ${domainId}.`, checks);
    const checklistRequired = [
      "buildArtifactExists",
      "envManifestExists",
      "credentialBindingExists",
      "approvalRequestExists",
      "deploymentTargetKnown",
      "rollbackPlanExists",
      "smokeTestPlanExists",
      "noFakeIntegrationSignals",
      "noCommittedSecrets",
      "currentValidationStatusPass",
    ];
    const checklistMissing = checklistRequired.some((key) => checklist?.[key] !== true);
    if (checklistMissing) return result(false, `Pre-deploy checklist is incomplete for ${domainId}.`, checks);

    const plan = planByDomain.get(domainId);
    if (!plan) return result(false, `Execution plan missing for ${domainId}.`, checks);
    if (plan.status !== "blocked_pending_approval" || plan.liveExecutionPerformed !== false) {
      return result(false, `Execution plan must remain blocked_pending_approval for ${domainId}.`, checks);
    }

    if (!smokeByDomain.has(domainId)) return result(false, `Smoke-test plan missing for ${domainId}.`, checks);
    if (!rollbackByDomain.has(domainId)) return result(false, `Rollback plan missing for ${domainId}.`, checks);
  }

  for (const binding of bindings) {
    if (binding?.plaintextSecretAllowed !== false) {
      return result(false, "Credential binding plaintextSecretAllowed must be false.", checks);
    }
    if (binding?.credentialValidationPerformed !== false) {
      return result(false, "Credential validation must not be performed in this pass.", checks);
    }
    if (containsSecretLikeValue(binding)) {
      return result(false, "Credential binding contains secret-looking values, which is forbidden.", checks);
    }
    const required = Array.isArray(binding?.requiredCredentialKeys) ? binding.requiredCredentialKeys : [];
    const missing = Array.isArray(binding?.missingCredentialKeys) ? binding.missingCredentialKeys : [];
    if (required.length > 0 && missing.length === 0) {
      return result(false, "Credential bindings must remain incomplete without supplied credentials in this pass.", checks);
    }
  }

  if (containsSecretLikeValue(proof)) {
    return result(false, "Proof contains secret-looking values, which is forbidden.", checks);
  }

  const invalidAudit = audits.some((event: any) =>
    event?.liveExecutionClaimed !== false ||
    String(event?.eventType || "").toLowerCase().includes("executed") ||
    String(event?.detail || "").toLowerCase().includes("live deployment executed")
  );
  if (invalidAudit) {
    return result(false, "Audit events must not claim live deployment execution in this pass.", checks);
  }

  const liveContracts = Array.isArray(proof?.liveDeploymentContracts) ? proof.liveDeploymentContracts : [];
  const hasLiveContracts = REQUIRED_DOMAINS.every((id) => liveContracts.some((item: any) => item?.domainId === id));
  if (!hasLiveContracts) return result(false, "Live deployment execution contracts are missing for one or more domains.", checks);
  const invalidLiveContracts = liveContracts.some((c: any) =>
    c?.blockedByDefault !== true ||
    c?.liveExecutionAllowed !== false ||
    c?.liveExecutionPerformed !== false ||
    c?.status !== "blocked_pending_approval"
  );
  if (invalidLiveContracts) return result(false, "One or more live deployment contracts violate blocked-by-default execution rules.", checks);

  if (typeof proof?.caveat !== "string" || !proof.caveat.trim()) {
    return result(false, "Proof caveat is missing.", checks);
  }

  return result(
    true,
    "Live deployment execution readiness is contract-backed, approval-gated, provider-aware, smoke-test-aware, rollback-aware, auditable, and blocked by default with no live execution performed.",
    checks
  );
}
