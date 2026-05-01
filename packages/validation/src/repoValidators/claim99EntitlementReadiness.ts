import fs from "fs";
import path from "path";
import type { RepoValidatorResult } from "../repoValidators";

type Requirement = {
  id?: string;
  requiredEvidenceClass?: string;
  evidencePath?: string;
  satisfied?: boolean;
  details?: string;
};

type Claim99EntitlementProof = {
  status?: string;
  claimId?: string;
  entitled?: boolean;
  requirements?: Requirement[];
  unmetRequirements?: string[];
  caveat?: string;
};

function has(root: string, rel: string): boolean {
  return fs.existsSync(path.join(root, rel));
}

function read(root: string, rel: string): string {
  return fs.readFileSync(path.join(root, rel), "utf8");
}

function fail(summary: string, checks: string[]): RepoValidatorResult {
  return {
    name: "Validate-Botomatic-Claim99EntitlementReadiness",
    status: "failed",
    summary,
    checks,
  };
}

function pass(summary: string, checks: string[]): RepoValidatorResult {
  return {
    name: "Validate-Botomatic-Claim99EntitlementReadiness",
    status: "passed",
    summary,
    checks,
  };
}

export function validateClaim99EntitlementReadiness(root: string): RepoValidatorResult {
  const checks = [
    "MASTER_TRUTH_SPEC.md",
    "LEGAL_CLAIM_BOUNDARIES.md",
    "EVIDENCE_BOUNDARY_POLICY.md",
    "MARKETING_CLAIMS_ALLOWED.md",
    "release-evidence/runtime/live_deployment_provider_execution_proof.json",
    "release-evidence/runtime/autobuild_99_statistical_proof.json",
    "release-evidence/runtime/claim_99_independent_audit.json",
    "release-evidence/runtime/claim_99_entitlement_proof.json",
  ];

  for (const rel of checks) {
    if (!has(root, rel)) return fail(`Required claim-entitlement file missing: ${rel}`, checks);
  }

  const marketing = read(root, "MARKETING_CLAIMS_ALLOWED.md").toLowerCase();
  const legal = read(root, "LEGAL_CLAIM_BOUNDARIES.md").toLowerCase();
  const evidence = read(root, "EVIDENCE_BOUNDARY_POLICY.md").toLowerCase();

  if (!evidence.includes("live-deployment-proven")) {
    return fail("EVIDENCE_BOUNDARY_POLICY.md must define live-deployment-proven evidence class.", checks);
  }

  if (!evidence.includes("exhaustive-domain-proven")) {
    return fail("EVIDENCE_BOUNDARY_POLICY.md must define exhaustive-domain-proven evidence class.", checks);
  }

  if (!legal.includes("representative proof") || !legal.includes("deployment readiness")) {
    return fail("LEGAL_CLAIM_BOUNDARIES.md must preserve representative-vs-live claim caveats.", checks);
  }

  let proof: Claim99EntitlementProof;
  try {
    proof = JSON.parse(read(root, "release-evidence/runtime/claim_99_entitlement_proof.json")) as Claim99EntitlementProof;
  } catch {
    return fail("Claim 99 entitlement proof artifact is not valid JSON.", checks);
  }

  if (proof.claimId !== "fully_built_live_and_autobuild_99_percent_of_supported_scope") {
    return fail("Claim 99 entitlement proof has an unexpected claimId.", checks);
  }

  const requirements = Array.isArray(proof.requirements) ? proof.requirements : [];
  const ids = new Set(requirements.map((r) => String(r.id || "")));
  const requiredIds = [
    "exhaustive_domain_proof",
    "live_deployment_proven_all_declared_providers",
    "autobuild_99_statistical_threshold",
    "independent_verification_audit",
  ];

  for (const id of requiredIds) {
    if (!ids.has(id)) return fail(`Claim 99 entitlement proof is missing requirement: ${id}`, checks);
  }

  const unmet = Array.isArray(proof.unmetRequirements) ? proof.unmetRequirements : [];

  if (proof.status === "eligible") {
    if (proof.entitled !== true) {
      return fail("Eligible claim 99 proof must set entitled=true.", checks);
    }

    if (unmet.length > 0) {
      return fail("Eligible claim 99 proof cannot contain unmet requirements.", checks);
    }

    const unsatisfied = requirements.filter((r) => r.satisfied !== true);
    if (unsatisfied.length > 0) {
      return fail("Eligible claim 99 proof cannot contain unsatisfied requirements.", checks);
    }

    if (marketing.includes("builds 99% of all software") || marketing.includes("fully replaces developers")) {
      return fail("Eligible claim state requires marketing policy updates to remove now-outdated prohibited claim language.", checks);
    }

    return pass("99% claim entitlement is active with required evidence and policy alignment.", checks);
  }

  if (proof.status !== "blocked") {
    return fail("Claim 99 entitlement proof status must be either blocked or eligible.", checks);
  }

  if (proof.entitled !== false) {
    return fail("Blocked claim 99 proof must set entitled=false.", checks);
  }

  if (unmet.length === 0) {
    return fail("Blocked claim 99 proof must list unmet requirements.", checks);
  }

  if (!marketing.includes("builds 99% of all software")) {
    return fail("Blocked claim 99 state must keep prohibited 99% claim language in marketing policy.", checks);
  }

  return pass(
    "99% claim entitlement gate is fail-closed and currently blocked pending live/statistical/audit proof classes.",
    checks
  );
}
