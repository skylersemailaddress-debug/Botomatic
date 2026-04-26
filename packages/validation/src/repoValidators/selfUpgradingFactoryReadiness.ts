import fs from "fs";
import path from "path";
import type { RepoValidatorResult } from "../repoValidators";

function has(root: string, rel: string): boolean {
  return fs.existsSync(path.join(root, rel));
}

function result(ok: boolean, summary: string, checks: string[]): RepoValidatorResult {
  return {
    name: "Validate-Botomatic-SelfUpgradingFactoryReadiness",
    status: ok ? "passed" : "failed",
    summary,
    checks,
  };
}

export function validateSelfUpgradingFactoryReadiness(root: string): RepoValidatorResult {
  const checks = [
    "ARCHITECTURE_CONSTITUTION.md",
    "SELF_UPGRADE_POLICY.md",
    "DRIFT_PREVENTION_POLICY.md",
    "VALIDATOR_NON_REGRESSION_POLICY.md",
    "PROOF_LEDGER.md",
    "packages/memory-engine/src/index.ts",
    "packages/proof-engine/src/claimVerifier.ts",
    "packages/self-upgrade-engine/src/selfUpgradeSpec.ts",
    "packages/self-upgrade-engine/src/regressionGuard.ts",
    "packages/self-upgrade-engine/src/architectureDriftDetector.ts",
    "packages/domain-builders/src/registry.ts",
    "packages/sandbox/src/policy.ts",
    "packages/repair-loop/src/runner.ts",
    "packages/capability-system/src/manager.ts",
    "release-evidence/runtime/self_upgrade_runtime_proof.json",
  ];

  if (!checks.every((p) => has(root, p))) {
    return result(false, "Self-upgrading factory foundations are incomplete.", checks);
  }

  let proof: any = null;
  try {
    proof = JSON.parse(fs.readFileSync(path.join(root, "release-evidence/runtime/self_upgrade_runtime_proof.json"), "utf8"));
  } catch {
    proof = null;
  }

  const routes = Array.isArray(proof?.routeExercised) ? proof.routeExercised : [];
  const validators = Array.isArray(proof?.validatorsRun) ? proof.validatorsRun : [];
  const producedArtifacts = Array.isArray(proof?.producedArtifacts) ? proof.producedArtifacts : [];
  const specPayload = proof?.contract?.payload || {};
  const planPayload = proof?.generatedPlanOrBuildGraph || {};
  const validatorWeakeningDetected = Boolean(proof?.validatorWeakeningDetected);
  const branchSafeOutput = proof?.branchSafeOutput || {};
  const hasRegressionValidatorPass =
    validators.some((v: any) => typeof v?.name === "string" && String(v.name).length > 0 && v?.status === "passed");
  const hasArchitectureDriftEvidence =
    producedArtifacts.includes("driftDetection") &&
    Array.isArray(specPayload?.affectedModules) &&
    Array.isArray(planPayload?.affectedModules);
  const hasRegressionEvidence =
    producedArtifacts.includes("regressionGuard") &&
    validators.some((v: any) => v?.name === "runRegressionGuard");
  const hasValidatorRunEvidence = validators.length >= 2;
  const hasBranchSafeOutput =
    branchSafeOutput?.mode === "non_mutating_proof" ||
    (typeof branchSafeOutput?.branchName === "string" && branchSafeOutput.branchName.length > 0) ||
    (typeof branchSafeOutput?.prUrl === "string" && branchSafeOutput.prUrl.length > 0);
  const proofOk =
    proof?.pathId === "self_upgrade" &&
    proof?.proofGrade === "local_runtime" &&
    proof?.status === "passed" &&
    proof?.contract?.type === "self_upgrade_spec" &&
    routes.some((r: any) => String(r?.path || "").includes("/self-upgrade/spec") && r?.ok === true) &&
    routes.some((r: any) => String(r?.path || "").includes("/self-upgrade/status") && r?.ok === true) &&
    hasArchitectureDriftEvidence &&
    hasRegressionEvidence &&
    hasValidatorRunEvidence &&
    !validatorWeakeningDetected &&
    hasBranchSafeOutput &&
    hasRegressionValidatorPass &&
    validators.some((v: any) => v?.name === "runRegressionGuard" && v?.status === "passed") &&
    Number(proof?.summary?.failedSteps || 0) === 0;

  return result(
    proofOk,
    proofOk
      ? "Self-upgrading factory foundations are present with anti-drift, memory, proof, domain, sandbox, repair, and capability controls."
      : "Self-upgrading factory runtime proof is missing or incomplete.",
    checks
  );
}
