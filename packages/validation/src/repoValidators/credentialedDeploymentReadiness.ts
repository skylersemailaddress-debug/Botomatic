import fs from "fs";
import path from "path";
import type { RepoValidatorResult } from "../repoValidators";
import { resolveEvidencePath } from "./evidencePath";

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

function has(root: string, rel: string): boolean {
  return fs.existsSync(path.join(root, rel));
}

function read(root: string, rel: string): string {
  return fs.readFileSync(path.join(root, rel), "utf8");
}


function hasProviderContractSourceCoverage(root: string): boolean {
  const contractRel = "packages/validation/src/runtime/deploymentProviderContracts.ts";
  const routeGateRel = "apps/orchestrator-api/src/deployProviderGates.ts";
  if (!has(root, contractRel) || !has(root, routeGateRel)) return false;
  const contractSource = read(root, contractRel);
  const routeGateSource = read(root, routeGateRel);
  return contractSource.includes("ProviderHandoffCompleteness") &&
    contractSource.includes("ProviderRollbackCompleteness") &&
    contractSource.includes("ProviderSecretPreflightLinkage") &&
    routeGateSource.includes("assertProviderPromoteGate") &&
    routeGateSource.includes("assertProviderRollbackGate") &&
    routeGateSource.includes("loadProviderDeploymentContracts");
}
function result(ok: boolean, summary: string, checks: string[]): RepoValidatorResult {
  return {
    name: "Validate-Botomatic-CredentialedDeploymentReadiness",
    status: ok ? "passed" : "failed",
    summary,
    checks,
  };
}

export function validateCredentialedDeploymentReadiness(root: string): RepoValidatorResult {
  const proofRel = "release-evidence/runtime/credentialed_deployment_readiness_proof.json";
  const checks = [proofRel];

  if (!has(root, proofRel)) {
    return result(
      false,
      "Credentialed deployment readiness proof is missing. Run npm run -s proof:credentialed-deployment-readiness.",
      checks
    );
  }

  let proof: any;
  try {
    proof = JSON.parse(read(root, proofRel));
  } catch {
    return result(false, "Credentialed deployment readiness proof JSON is invalid.", checks);
  }

  if (proof?.pathId !== "credentialed_deployment_readiness") {
    return result(false, `Credentialed deployment readiness proof has wrong pathId (got: ${proof?.pathId}).`, checks);
  }

  if (proof?.status !== "passed") {
    return result(false, `Credentialed deployment readiness proof status is not passed (got: ${proof?.status}).`, checks);
  }

  if (proof?.requiredDomainPresence !== true) {
    return result(false, "Credentialed deployment readiness proof does not assert requiredDomainPresence=true.", checks);
  }

  // Must assert live deployment is blocked by default
  if (proof?.liveDeploymentBlockedByDefault !== true) {
    return result(false, "Proof does not assert liveDeploymentBlockedByDefault=true.", checks);
  }

  // Must assert no secrets were committed
  if (proof?.secretsCommitted !== false) {
    return result(false, "Proof does not assert secretsCommitted=false.", checks);
  }

  // Must assert no live deployment was claimed
  if (proof?.liveDeploymentClaimed !== false) {
    return result(false, "Proof does not assert liveDeploymentClaimed=false.", checks);
  }

  // Must assert credential validation was not performed in this proof
  if (proof?.credentialValidationPerformed !== false) {
    return result(false, "Proof must assert credentialValidationPerformed=false (non-executing preflight only).", checks);
  }

  // Must include explicit credential preflight contract
  const cpc = proof?.credentialPreflightContract;
  if (typeof cpc !== "object" || cpc === null) {
    return result(false, "Proof is missing credentialPreflightContract.", checks);
  }
  if (cpc?.nonExecutingUnlessCredentialsSupplied !== true) {
    return result(false, "credentialPreflightContract must assert nonExecutingUnlessCredentialsSupplied=true.", checks);
  }
  if (cpc?.requiresExplicitUserApproval !== true) {
    return result(false, "credentialPreflightContract must assert requiresExplicitUserApproval=true.", checks);
  }
  if (cpc?.preflightChecksStructuralOnly !== true) {
    return result(false, "credentialPreflightContract must assert preflightChecksStructuralOnly=true.", checks);
  }
  if (cpc?.liveExecutionTriggeredInThisProof !== false) {
    return result(false, "credentialPreflightContract must assert liveExecutionTriggeredInThisProof=false.", checks);
  }

  // Must include dry-run vs live deployment separation model
  const dms = proof?.deploymentModeSeparation;
  if (typeof dms !== "object" || dms === null || dms?.separationEnforced !== true) {
    return result(false, "Proof is missing deploymentModeSeparation or separationEnforced=true.", checks);
  }

  const spc = proof?.secretPreflightContract;
  if (typeof spc !== "object" || spc === null) {
    return result(false, "Proof is missing secretPreflightContract.", checks);
  }
  if (spc?.deploymentPreflightIncludesSecrets !== true) {
    return result(false, "secretPreflightContract must assert deploymentPreflightIncludesSecrets=true.", checks);
  }
  if (spc?.noPlaintextSecretValuesStored !== true) {
    return result(false, "secretPreflightContract must assert noPlaintextSecretValuesStored=true.", checks);
  }
  if (spc?.liveDeploymentBlockedWhenSecretsMissing !== true) {
    return result(false, "secretPreflightContract must assert liveDeploymentBlockedWhenSecretsMissing=true.", checks);
  }

  // Must assert approvalGateStatus is blocked (not approved/live)
  const allowedGateStatuses = ["blocked_default", "blocked_no_credentials", "not_requested"];
  if (!allowedGateStatuses.includes(String(proof?.approvalGateStatus))) {
    return result(false, `Proof approvalGateStatus "${proof?.approvalGateStatus}" implies live deployment was unblocked — not allowed in this proof pass.`, checks);
  }

  const sourceContractsBackfilled = hasProviderContractSourceCoverage(root);
  const domainResults: any[] = Array.isArray(proof?.domainResults) ? proof.domainResults : [];

  // All required domains must be present
  const missingDomains = REQUIRED_DOMAINS.filter((id) => !domainResults.some((d) => d?.domainId === id));
  if (missingDomains.length > 0) {
    return result(false, `Credentialed deployment readiness proof is missing required domain rows: ${missingDomains.join(", ")}`, checks);
  }

  // Per-domain checks
  for (const domainId of REQUIRED_DOMAINS) {
    const d = domainResults.find((item: any) => item?.domainId === domainId);
    if (!d) {
      return result(false, `Domain row missing for ${domainId}.`, checks);
    }

    // deploymentTarget must be present
    if (typeof d?.deploymentTarget !== "string" || !d.deploymentTarget.trim()) {
      return result(false, `Domain ${domainId}: deploymentTarget is missing.`, checks);
    }

    // Must have at least one credential declared
    const credentialCount = Number(d?.credentialCount ?? 0);
    if (credentialCount < 1) {
      return result(false, `Domain ${domainId}: no credential requirements declared.`, checks);
    }

    // Required credentials must be declared as a non-empty array
    if (!Array.isArray(d?.requiredCredentials) || d.requiredCredentials.length < 1) {
      return result(false, `Domain ${domainId}: requiredCredentials is missing or empty.`, checks);
    }

    // Approval gate must be blocked
    if (!allowedGateStatuses.includes(String(d?.approvalGateStatus))) {
      return result(false, `Domain ${domainId}: approvalGateStatus "${d?.approvalGateStatus}" implies live deployment was unblocked.`, checks);
    }

    // Live deployment must be blocked
    if (d?.liveDeploymentBlocked !== true) {
      return result(false, `Domain ${domainId}: liveDeploymentBlocked is not true.`, checks);
    }

    // Must have at least one provider adapter
    if (Number(d?.providerAdapterCount ?? 0) < 1) {
      return result(false, `Domain ${domainId}: no provider adapters declared.`, checks);
    }

    // All preflight checks must be passed or skipped (not failed)
    const preflights: any[] = Array.isArray(d?.preflightStatuses) ? d.preflightStatuses : [];
    for (const p of preflights) {
      if (!["passed", "skipped"].includes(String(p?.preflightStatus))) {
        return result(false, `Domain ${domainId}: provider ${p?.provider} preflight check has status "${p?.preflightStatus}".`, checks);
      }
    }

    // Secret policy must all pass
    if (d?.secretPolicyAllPass !== true) {
      return result(false, `Domain ${domainId}: secret policy checks did not all pass.`, checks);
    }

    // Credential manifest must be complete
    if (d?.credentialManifestComplete !== true) {
      return result(false, `Domain ${domainId}: credentialManifestComplete is not true.`, checks);
    }

    // Manifest status must be correct
    if (d?.manifestStatus !== "ready_for_approved_credentialed_deployment") {
      return result(false, `Domain ${domainId}: manifestStatus is "${d?.manifestStatus}" — must be ready_for_approved_credentialed_deployment.`, checks);
    }
    const handoff = d?.providerHandoffCompleteness;
    const rollback = d?.providerRollbackCompleteness;
    const secretLinkage = d?.providerSecretPreflightLinkage;
    if (!handoff || !rollback || !secretLinkage) {
      if (!sourceContractsBackfilled) {
        return result(false, `Domain ${domainId}: provider contract fields missing in proof and source coverage is missing.`, checks);
      }
    } else {
      if (handoff.status !== "complete" || handoff.approvalRequired !== true || handoff.rollbackPlanPresent !== true) return result(false, `Domain ${domainId}: providerHandoffCompleteness is missing/incomplete or not approval-gated.`, checks);
      if (rollback.status !== "complete" || rollback.approvalRequired !== true || rollback.rollbackCommandTemplatePresent !== true) return result(false, `Domain ${domainId}: providerRollbackCompleteness is missing/incomplete or not approval-gated.`, checks);
      if (secretLinkage.plaintextSecretsStored !== false || secretLinkage.preflightRequiredBeforeDeploy !== true) return result(false, `Domain ${domainId}: providerSecretPreflightLinkage violates secret preflight contract.`, checks);
      if (!Array.isArray(secretLinkage.missingSecretRefs) || secretLinkage.missingSecretRefs.length < 1) return result(false, `Domain ${domainId}: providerSecretPreflightLinkage must include missingSecretRefs for blocked deployment readiness.`, checks);
    }

    // Per-domain manifest file must exist
    const manifestPath = d?.manifestPath;
    if (typeof manifestPath === "string" && manifestPath && !fs.existsSync(resolveEvidencePath(root, manifestPath))) {
      return result(false, `Domain ${domainId}: manifest file not found at ${manifestPath}.`, checks);
    }
  }

  // No failed domains
  if (Number(proof?.failedDomainCount ?? 1) !== 0) {
    return result(false, `Credentialed deployment readiness proof has ${proof?.failedDomainCount} failed domain(s).`, checks);
  }

  // Caveat must be present
  if (typeof proof?.caveat !== "string" || !proof.caveat.trim()) {
    return result(false, "Proof caveat is missing — must explicitly state this is not proof of live deployment.", checks);
  }

  return result(
    true,
    "Credentialed deployment readiness is declared per required domain: credential manifests complete, approval gates blocked, provider adapters defined, secret policies pass, live deployment blocked by default.",
    checks
  );
}
