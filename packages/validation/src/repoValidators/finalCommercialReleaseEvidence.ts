import fs from "fs";
import path from "path";

export type RepoValidatorResult = {
  name: string;
  status: "passed" | "failed";
  summary: string;
  checks: string[];
};

function result(name: string, ok: boolean, summary: string, checks: string[]): RepoValidatorResult {
  return { name, status: ok ? "passed" : "failed", summary, checks };
}

function has(root: string, rel: string): boolean {
  return fs.existsSync(path.join(root, rel));
}

function read(root: string, rel: string): string {
  return fs.readFileSync(path.join(root, rel), "utf8");
}

export function validateFinalCommercialReleaseEvidence(root: string): RepoValidatorResult {
  const checks: string[] = [];
  const issues: string[] = [];

  // Check final evidence artifact exists
  const evidencePath = path.join(root, "release-evidence", "runtime", "final_commercial_release_evidence.json");
  if (!has(root, "release-evidence/runtime/final_commercial_release_evidence.json")) {
    issues.push("final_commercial_release_evidence.json missing");
    return result(
      "Validate-Botomatic-FinalCommercialReleaseEvidence",
      false,
      "Final commercial release evidence artifact is missing.",
      checks
    );
  }

  checks.push("release-evidence/runtime/final_commercial_release_evidence.json exists");

  let evidence: any = null;
  try {
    evidence = JSON.parse(read(root, "release-evidence/runtime/final_commercial_release_evidence.json"));
  } catch (e) {
    issues.push(`final_commercial_release_evidence.json is malformed: ${String(e)}`);
    return result(
      "Validate-Botomatic-FinalCommercialReleaseEvidence",
      false,
      "Final commercial release evidence artifact is malformed JSON.",
      checks
    );
  }

  checks.push("final_commercial_release_evidence.json is valid JSON");

  // Verify required proof artifacts exist
  const requiredProofs = [
    "builder_quality_benchmark.json",
    "greenfield_runtime_proof.json",
    "dirty_repo_runtime_proof.json",
    "self_upgrade_runtime_proof.json",
    "universal_pipeline_runtime_proof.json",
    "multi_domain_emitted_output_proof.json",
    "domain_runtime_command_execution_proof.json",
    "external_integration_deployment_readiness_proof.json",
    "deployment_dry_run_proof.json",
    "credentialed_deployment_readiness_proof.json",
    "live_deployment_execution_readiness_proof.json",
    "secrets_credential_management_readiness_proof.json",
  ];

  for (const proofFile of requiredProofs) {
    if (!has(root, `release-evidence/runtime/${proofFile}`)) {
      issues.push(`Required proof artifact missing: ${proofFile}`);
    } else {
      checks.push(`release-evidence/runtime/${proofFile} exists`);
    }
  }

  if (issues.length > 0) {
    return result(
      "Validate-Botomatic-FinalCommercialReleaseEvidence",
      false,
      `Final commercial release evidence missing required proof artifacts: ${issues.join("; ")}`,
      checks
    );
  }

  // Verify required fields in evidence
  const requiredFields = [
    "generatedAt",
    "branch",
    "repo",
    "finalStatus",
    "validatorCount",
    "failedValidatorCount",
    "benchmarkSummary",
    "coreRuntimeProofSummary",
    "emittedOutputProofSummary",
    "multiDomainProofSummary",
    "runtimeCommandProofSummary",
    "externalDeploymentReadinessSummary",
    "deploymentDryRunSummary",
    "credentialedDeploymentReadinessSummary",
    "liveDeploymentExecutionReadinessSummary",
    "secretsCredentialManagementReadinessSummary",
    "explicitCaveats",
    "noLiveDeploymentClaim",
    "noRealSecretsUsed",
    "noRealProviderApisCalled",
    "liveDeploymentBlockedByDefault",
    "representativeNotExhaustive",
  ];

  for (const field of requiredFields) {
    if (!(field in evidence)) {
      issues.push(`Missing required field: ${field}`);
    } else {
      checks.push(`evidence.${field} present`);
    }
  }

  if (issues.length > 0) {
    return result(
      "Validate-Botomatic-FinalCommercialReleaseEvidence",
      false,
      `Final commercial release evidence missing required fields: ${issues.join("; ")}`,
      checks
    );
  }

  // Verify safety flags are true
  if (evidence.noLiveDeploymentClaim !== true) {
    issues.push("noLiveDeploymentClaim is not true");
  } else {
    checks.push("noLiveDeploymentClaim=true");
  }

  if (evidence.noRealSecretsUsed !== true) {
    issues.push("noRealSecretsUsed is not true");
  } else {
    checks.push("noRealSecretsUsed=true");
  }

  if (evidence.noRealProviderApisCalled !== true) {
    issues.push("noRealProviderApisCalled is not true");
  } else {
    checks.push("noRealProviderApisCalled=true");
  }

  if (evidence.liveDeploymentBlockedByDefault !== true) {
    issues.push("liveDeploymentBlockedByDefault is not true");
  } else {
    checks.push("liveDeploymentBlockedByDefault=true");
  }

  if (evidence.representativeNotExhaustive !== true) {
    issues.push("representativeNotExhaustive is not true");
  } else {
    checks.push("representativeNotExhaustive=true");
  }

  // Verify validator count and failed count
  if (evidence.validatorCount < 29) {
    issues.push(`validatorCount (${evidence.validatorCount}) is less than required 29`);
  } else {
    checks.push(`validatorCount=${evidence.validatorCount} (>= 29)`);
  }

  if (evidence.failedValidatorCount !== 0) {
    issues.push(`failedValidatorCount is ${evidence.failedValidatorCount}, expected 0`);
  } else {
    checks.push("failedValidatorCount=0");
  }

  // Verify benchmark passed
  if (
    evidence.benchmarkSummary &&
    evidence.benchmarkSummary.launchablePass === true &&
    evidence.benchmarkSummary.universalPass === true &&
    evidence.benchmarkSummary.criticalFailures === 0
  ) {
    checks.push("benchmarkSummary shows strict pass");
  } else {
    issues.push("benchmarkSummary does not show strict pass (launchablePass=true, universalPass=true, criticalFailures=0)");
  }

  // Verify caveats exist and are comprehensive
  if (!Array.isArray(evidence.explicitCaveats) || evidence.explicitCaveats.length === 0) {
    issues.push("explicitCaveats is missing or empty");
  } else {
    checks.push(`explicitCaveats array present with ${evidence.explicitCaveats.length} entries`);
    if (!evidence.explicitCaveats.some((c: string) => c.includes("representative") && c.includes("not exhaustive"))) {
      issues.push("explicitCaveats do not clearly state 'representative, not exhaustive'");
    } else {
      checks.push("explicitCaveats include representative/not-exhaustive language");
    }
  }

  if (issues.length > 0) {
    return result(
      "Validate-Botomatic-FinalCommercialReleaseEvidence",
      false,
      `Final commercial release evidence validation failed: ${issues.join("; ")}`,
      checks
    );
  }

  return result(
    "Validate-Botomatic-FinalCommercialReleaseEvidence",
    true,
    "Final commercial release evidence is complete, consistent, and meets all commercial hardening criteria.",
    checks
  );
}
