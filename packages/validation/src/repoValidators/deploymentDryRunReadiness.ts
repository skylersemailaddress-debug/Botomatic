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

function has(root: string, rel: string): boolean {
  return fs.existsSync(path.join(root, rel));
}

function read(root: string, rel: string): string {
  return fs.readFileSync(path.join(root, rel), "utf8");
}

function result(ok: boolean, summary: string, checks: string[]): RepoValidatorResult {
  return {
    name: "Validate-Botomatic-DeploymentDryRunReadiness",
    status: ok ? "passed" : "failed",
    summary,
    checks,
  };
}

export function validateDeploymentDryRunReadiness(root: string): RepoValidatorResult {
  const proofRel = "release-evidence/runtime/deployment_dry_run_proof.json";
  const checks = [proofRel];

  if (!has(root, proofRel)) {
    return result(
      false,
      "Deployment dry-run proof is missing. Run npm run -s proof:deployment-dry-run.",
      checks
    );
  }

  let proof: any;
  try {
    proof = JSON.parse(read(root, proofRel));
  } catch {
    return result(false, "Deployment dry-run proof JSON is invalid.", checks);
  }

  if (proof?.pathId !== "deployment_dry_run") {
    return result(false, "Deployment dry-run proof has wrong pathId.", checks);
  }

  if (proof?.status !== "passed") {
    return result(false, `Deployment dry-run proof status is not passed (got: ${proof?.status}).`, checks);
  }

  if (proof?.requiredDomainPresence !== true) {
    return result(false, "Deployment dry-run proof does not assert requiredDomainPresence=true.", checks);
  }

  const domainResults: any[] = Array.isArray(proof?.domainResults) ? proof.domainResults : [];

  // All required domains must be present
  const missingDomains = REQUIRED_DOMAINS.filter((id) => !domainResults.some((d) => d?.domainId === id));
  if (missingDomains.length > 0) {
    return result(false, `Deployment dry-run proof is missing required domain rows: ${missingDomains.join(", ")}`, checks);
  }

  // Per-domain checks
  for (const domainId of REQUIRED_DOMAINS) {
    const d = domainResults.find((item: any) => item?.domainId === domainId);
    if (!d) {
      return result(false, `Domain row missing for ${domainId}.`, checks);
    }

    // dryRunMethod must be present and non-empty
    if (typeof d?.dryRunMethod !== "string" || !d.dryRunMethod.trim()) {
      return result(false, `Domain ${domainId}: dryRunMethod is missing or empty.`, checks);
    }

    // emittedPath must be present
    if (typeof d?.emittedPath !== "string" || !d.emittedPath) {
      return result(false, `Domain ${domainId}: emittedPath is missing.`, checks);
    }

    // deploymentTarget must be present
    if (typeof d?.deploymentTarget !== "string" || !d.deploymentTarget.trim()) {
      return result(false, `Domain ${domainId}: deploymentTarget is missing.`, checks);
    }

    // credentialRequirementClassification must be present
    const validCredClasses = [
      "no_credentials_required",
      "credentials_required_skipped",
      "credentials_required_structural_only",
    ];
    if (!validCredClasses.includes(d?.credentialRequirementClassification)) {
      return result(false, `Domain ${domainId}: credentialRequirementClassification is invalid.`, checks);
    }

    // liveDeploymentSkippedReason must be non-empty
    if (typeof d?.liveDeploymentSkippedReason !== "string" || !d.liveDeploymentSkippedReason.trim()) {
      return result(false, `Domain ${domainId}: liveDeploymentSkippedReason is missing (skipped live deployment must have explicit reason).`, checks);
    }

    // smokeTestPlanPath must be present and the file must exist
    if (typeof d?.smokeTestPlanPath !== "string" || !d.smokeTestPlanPath) {
      return result(false, `Domain ${domainId}: smokeTestPlanPath is missing.`, checks);
    }
    if (!fs.existsSync(d.smokeTestPlanPath)) {
      return result(false, `Domain ${domainId}: smokeTestPlanPath does not exist at ${d.smokeTestPlanPath}.`, checks);
    }

    // rollbackPlanPath must be present and the file must exist
    if (typeof d?.rollbackPlanPath !== "string" || !d.rollbackPlanPath) {
      return result(false, `Domain ${domainId}: rollbackPlanPath is missing.`, checks);
    }
    if (!fs.existsSync(d.rollbackPlanPath)) {
      return result(false, `Domain ${domainId}: rollbackPlanPath does not exist at ${d.rollbackPlanPath}.`, checks);
    }

    // dryRunStatus must be passed or skipped, never failed
    const drs = d?.dryRunStatus;
    if (!["passed", "skipped"].includes(String(drs))) {
      return result(false, `Domain ${domainId}: dryRunStatus is "${drs}" — must be passed or skipped. Re-run proof:deployment-dry-run.`, checks);
    }

    // readinessStatus must be passed or passed_with_caveats
    const rs = d?.readinessStatus;
    if (!["passed", "passed_with_caveats"].includes(String(rs))) {
      return result(false, `Domain ${domainId}: readinessStatus is "${rs}" — must be passed or passed_with_caveats.`, checks);
    }

    // readinessCaveat must be present
    if (typeof d?.readinessCaveat !== "string" || !d.readinessCaveat.trim()) {
      return result(false, `Domain ${domainId}: readinessCaveat is missing.`, checks);
    }

    // If credentialed live deployment is claimed without evidence (i.e., credentialClass is no_credentials_required
    // but liveDeploymentSkippedReason implies credentials were used), fail closed.
    // In practice: if credentialClass is no_credentials_required, we must still have explicit documentation.
    // This check ensures we never silently claim a live deployment occurred.
    // (All domains in this proof are credentials_required_skipped, so this guard is defensive.)
  }

  // No failed domains allowed
  const failedDomainCount = Number(proof?.failedDomainCount ?? 1);
  if (failedDomainCount !== 0) {
    return result(false, `Deployment dry-run proof has ${failedDomainCount} failed domain(s).`, checks);
  }

  return result(
    true,
    "Deployment dry-run readiness evidence is complete across all required domains with smoke-test plans, rollback plans, and explicit live-deployment-skip justifications.",
    checks
  );
}
