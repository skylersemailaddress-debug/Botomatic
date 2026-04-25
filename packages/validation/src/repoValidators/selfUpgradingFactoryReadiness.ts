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
  ];

  if (!checks.every((p) => has(root, p))) {
    return result(false, "Self-upgrading factory foundations are incomplete.", checks);
  }

  return result(
    true,
    "Self-upgrading factory foundations are present with anti-drift, memory, proof, domain, sandbox, repair, and capability controls.",
    checks
  );
}
