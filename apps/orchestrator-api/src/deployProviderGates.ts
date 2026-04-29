import fs from "fs";
import path from "path";

export type ProviderGateState = {
  allowed: boolean;
  reasons: string[];
  mode: "blocked" | "planning_only";
  providerContractSource: string;
  handoffStatus?: string;
  rollbackStatus?: string;
};

export function loadProviderDeploymentContracts(root: string): {
  handoff: any[];
  rollback: any[];
  secretLinkage: any[];
  source: string;
} {
  const runtimeDir = path.join(root, "release-evidence", "runtime");
  const candidateProofs = [
    path.join(runtimeDir, "live_deployment_execution_readiness_proof.json"),
    path.join(runtimeDir, "credentialed_deployment_readiness_proof.json"),
    path.join(runtimeDir, "deployment_dry_run_proof.json"),
  ];

  for (const proofPath of candidateProofs) {
    if (!fs.existsSync(proofPath)) continue;
    try {
      const proof = JSON.parse(fs.readFileSync(proofPath, "utf8"));
      const handoff = Array.isArray(proof?.providerHandoffCompleteness)
        ? proof.providerHandoffCompleteness
        : Array.isArray(proof?.domainResults)
          ? proof.domainResults.map((d: any) => d?.providerHandoffCompleteness).filter(Boolean)
          : [];
      const rollback = Array.isArray(proof?.providerRollbackCompleteness)
        ? proof.providerRollbackCompleteness
        : Array.isArray(proof?.domainResults)
          ? proof.domainResults.map((d: any) => d?.providerRollbackCompleteness).filter(Boolean)
          : [];
      const secretLinkage = Array.isArray(proof?.providerSecretPreflightLinkage)
        ? proof.providerSecretPreflightLinkage
        : Array.isArray(proof?.domainResults)
          ? proof.domainResults.map((d: any) => d?.providerSecretPreflightLinkage).filter(Boolean)
          : [];
      return { handoff, rollback, secretLinkage, source: path.relative(root, proofPath) };
    } catch {
      continue;
    }
  }

  return { handoff: [], rollback: [], secretLinkage: [], source: "missing" };
}

export function assertProviderPromoteGate(providerContracts: ReturnType<typeof loadProviderDeploymentContracts>): ProviderGateState {
  const reasons: string[] = [];
  const handoff = providerContracts.handoff.find((c: any) => c?.environment === "prod") || providerContracts.handoff[0];
  const secretLink = providerContracts.secretLinkage.find((c: any) => c?.environment === "prod") || providerContracts.secretLinkage[0];

  if (!handoff) reasons.push("missing_provider_contract: provider handoff completeness evidence is missing");
  if (!secretLink) reasons.push("missing_provider_contract: provider secret preflight linkage is missing");

  if (handoff) {
    if (!["complete", "blocked"].includes(String(handoff.status))) reasons.push("needs_evidence: handoff.status must be complete or blocked");
    if (handoff.approvalRequired !== true) reasons.push("provider_handoff_approval_required_false");
    if (handoff.rollbackPlanPresent !== true) reasons.push("provider_handoff_missing_rollback_plan");
    if (handoff.smokePlanPresent !== true) reasons.push("provider_handoff_missing_smoke_plan");
    if (handoff.deployCommandTemplatePresent !== true) reasons.push("provider_handoff_missing_deploy_command_template");
  }

  if (secretLink) {
    if (secretLink.plaintextSecretsStored !== false) reasons.push("provider_secret_linkage_plaintext_secrets_forbidden");
    if (secretLink.preflightRequiredBeforeDeploy !== true) reasons.push("provider_secret_linkage_preflight_required_false");
  }

  return {
    allowed: reasons.length === 0,
    reasons,
    mode: "planning_only",
    providerContractSource: providerContracts.source,
    handoffStatus: handoff?.status,
  };
}

export function assertProviderRollbackGate(providerContracts: ReturnType<typeof loadProviderDeploymentContracts>): ProviderGateState {
  const reasons: string[] = [];
  const rollback = providerContracts.rollback.find((c: any) => c?.environment === "prod") || providerContracts.rollback[0];
  if (!rollback) reasons.push("missing_provider_contract: provider rollback completeness evidence is missing");

  if (rollback) {
    if (!["complete", "blocked"].includes(String(rollback.status))) reasons.push("needs_evidence: rollback.status must be complete or blocked");
    if (rollback.approvalRequired !== true) reasons.push("provider_rollback_approval_required_false");
    if (rollback.rollbackCommandTemplatePresent !== true) reasons.push("provider_rollback_missing_command_template");
    if (rollback.previousVersionReferenceRequired !== true) reasons.push("provider_rollback_previous_version_reference_required_false");
    if (rollback.dataRollbackBoundaryDocumented !== true) reasons.push("provider_rollback_data_boundary_missing");
  }

  return {
    allowed: reasons.length === 0,
    reasons,
    mode: "planning_only",
    providerContractSource: providerContracts.source,
    rollbackStatus: rollback?.status,
  };
}
