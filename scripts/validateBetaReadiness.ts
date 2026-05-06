import fs from "fs";
import path from "path";

const ROOT = process.cwd();
const OUTPUT_RELATIVE_PATH = "release-evidence/runtime/beta_readiness_gate.json";

type JsonValue = null | boolean | number | string | JsonValue[] | { [key: string]: JsonValue };

type ProofRequirement = {
  artifact: string;
  label: string;
  signals: string[];
};

type SignalResult = {
  name: string;
  present: boolean;
  passing: boolean;
  value?: JsonValue;
};

type ArtifactResult = {
  artifact: string;
  label: string;
  exists: boolean;
  parseable: boolean;
  passed: boolean;
  missingSignals: string[];
  failingSignals: string[];
  signals: SignalResult[];
  error?: string;
};

const REQUIREMENTS: ProofRequirement[] = [
  {
    artifact: "release-evidence/runtime/tenant_isolation_proof.json",
    label: "Tenant/project isolation proof",
    signals: [
      "cross_tenant_read_blocked",
      "cross_tenant_write_blocked",
      "project_scope_enforced",
      "tenant_context_required",
      "isolation_regression_suite_passed",
    ],
  },
  {
    artifact: "release-evidence/runtime/security_auth_beta_proof.json",
    label: "Production/beta auth fail-closed proof",
    signals: [
      "production_rejects_auth_disabled",
      "production_rejects_development_runtime",
      "unauthenticated_mutation_denied",
      "wrong_role_denied",
      "wrong_owner_denied",
      "unauthenticated_requests_blocked",
      "invalid_session_blocked",
      "expired_session_blocked",
      "privileged_routes_require_auth",
      "production_beta_auth_fail_closed",
    ],
  },
  {
    artifact: "release-evidence/runtime/no_secrets_beta_proof.json",
    label: "No-secrets proof across source/history/evidence/logs/generated apps/UI/API",
    signals: [
      "source_secret_scan_passed",
      "git_history_secret_scan_passed",
      "release_evidence_secret_scan_passed",
      "logs_secret_scan_passed",
      "generated_apps_secret_scan_passed",
      "ui_api_secret_scan_passed",
    ],
  },
  {
    artifact: "release-evidence/runtime/orchestration_core_beta_proof.json",
    label: "Durable orchestration E2E proof",
    signals: [
      "durable_job_created",
      "worker_restarted_and_resumed",
      "state_persisted_across_restart",
      "idempotent_retry_verified",
      "end_to_end_completion_verified",
    ],
  },
  {
    artifact: "release-evidence/runtime/durable_fail_closed_beta_proof.json",
    label: "Durable storage outage fail-closed proof",
    signals: [
      "storage_outage_detected",
      "writes_blocked_during_outage",
      "unsafe_reads_blocked_during_outage",
      "no_in_memory_success_fallback",
      "service_recovered_after_storage_restore",
    ],
  },
  {
    artifact: "release-evidence/runtime/deployment_smoke_beta_proof.json",
    label: "Beta deployment smoke/rollback proof",
    signals: [
      "beta_environment_deployed",
      "post_deploy_smoke_passed",
      "healthcheck_passed",
      "rollback_exercised",
      "post_rollback_smoke_passed",
    ],
  },
];

function isRecord(value: JsonValue | undefined): value is { [key: string]: JsonValue } {
  return Boolean(value && typeof value === "object" && !Array.isArray(value));
}

function getSignalValue(document: JsonValue, signalName: string): JsonValue | undefined {
  if (!isRecord(document)) return undefined;

  const topLevelSignals = document.signals;
  if (isRecord(topLevelSignals) && Object.prototype.hasOwnProperty.call(topLevelSignals, signalName)) {
    return topLevelSignals[signalName];
  }

  if (Object.prototype.hasOwnProperty.call(document, signalName)) {
    return document[signalName];
  }

  return undefined;
}

function hasExplicitFailureString(value: string): boolean {
  return ["fail", "failed", "false", "missing", "error", "errored", "not_run", "not-run", "skipped"].includes(
    value.trim().toLowerCase(),
  );
}

function isPassingSignal(value: JsonValue | undefined): boolean {
  if (value === undefined || value === null) return false;
  if (typeof value === "boolean") return value;
  if (typeof value === "number") return Number.isFinite(value) && value > 0;
  if (typeof value === "string") return value.trim().length > 0 && !hasExplicitFailureString(value);
  if (Array.isArray(value)) return value.length > 0;

  const status = value.status;
  if (typeof status === "string" && hasExplicitFailureString(status)) return false;
  if (typeof status === "string" && status.trim().length > 0) return true;

  const passed = value.passed ?? value.pass ?? value.ok ?? value.success ?? value.verified;
  if (typeof passed === "boolean") return passed;
  if (typeof passed === "string") return passed.trim().length > 0 && !hasExplicitFailureString(passed);

  return Object.keys(value).length > 0;
}

function readArtifact(requirement: ProofRequirement): ArtifactResult {
  const absolutePath = path.join(ROOT, requirement.artifact);

  if (!fs.existsSync(absolutePath)) {
    return {
      artifact: requirement.artifact,
      label: requirement.label,
      exists: false,
      parseable: false,
      passed: false,
      missingSignals: requirement.signals,
      failingSignals: [],
      signals: requirement.signals.map((name) => ({ name, present: false, passing: false })),
      error: "Proof artifact is missing.",
    };
  }

  let parsed: JsonValue;
  try {
    parsed = JSON.parse(fs.readFileSync(absolutePath, "utf8")) as JsonValue;
  } catch (error) {
    return {
      artifact: requirement.artifact,
      label: requirement.label,
      exists: true,
      parseable: false,
      passed: false,
      missingSignals: requirement.signals,
      failingSignals: [],
      signals: requirement.signals.map((name) => ({ name, present: false, passing: false })),
      error: `Proof artifact is not valid JSON: ${error instanceof Error ? error.message : String(error)}`,
    };
  }

  const signals = requirement.signals.map((name) => {
    const value = getSignalValue(parsed, name);
    return {
      name,
      present: value !== undefined,
      passing: isPassingSignal(value),
      ...(value !== undefined ? { value } : {}),
    };
  });
  const missingSignals = signals.filter((signal) => !signal.present).map((signal) => signal.name);
  const failingSignals = signals
    .filter((signal) => signal.present && !signal.passing)
    .map((signal) => signal.name);

  return {
    artifact: requirement.artifact,
    label: requirement.label,
    exists: true,
    parseable: true,
    passed: missingSignals.length === 0 && failingSignals.length === 0,
    missingSignals,
    failingSignals,
    signals,
  };
}

function writeAggregate(results: ArtifactResult[]) {
  const aggregate = {
    gate: "friends_and_family_beta_readiness",
    generatedAt: new Date().toISOString(),
    passed: results.every((result) => result.passed),
    requiredArtifacts: REQUIREMENTS.map((requirement) => requirement.artifact),
    missingArtifacts: results.filter((result) => !result.exists).map((result) => result.artifact),
    invalidArtifacts: results
      .filter((result) => result.exists && !result.parseable)
      .map((result) => ({ artifact: result.artifact, error: result.error })),
    missingSignals: results
      .filter((result) => result.missingSignals.length > 0)
      .map((result) => ({ artifact: result.artifact, signals: result.missingSignals })),
    failingSignals: results
      .filter((result) => result.failingSignals.length > 0)
      .map((result) => ({ artifact: result.artifact, signals: result.failingSignals })),
    results,
  };

  const outputPath = path.join(ROOT, OUTPUT_RELATIVE_PATH);
  fs.mkdirSync(path.dirname(outputPath), { recursive: true });
  fs.writeFileSync(outputPath, `${JSON.stringify(aggregate, null, 2)}\n`, "utf8");
  return aggregate;
}

function printFailures(results: ArtifactResult[], outputPath: string) {
  console.error("\nFriends-and-family beta readiness gate FAILED.\n");
  console.error("Botomatic is not beta-ready until every private beta blocker has a passing proof artifact.");

  const missingArtifacts = results.filter((result) => !result.exists);
  if (missingArtifacts.length > 0) {
    console.error("\nMissing proof artifacts:");
    for (const result of missingArtifacts) {
      console.error(`  - ${result.artifact}`);
    }
  }

  const invalidArtifacts = results.filter((result) => result.exists && !result.parseable);
  if (invalidArtifacts.length > 0) {
    console.error("\nInvalid proof artifacts:");
    for (const result of invalidArtifacts) {
      console.error(`  - ${result.artifact}: ${result.error}`);
    }
  }

  const artifactsWithMissingSignals = results.filter((result) => result.missingSignals.length > 0);
  if (artifactsWithMissingSignals.length > 0) {
    console.error("\nMissing proof signals:");
    for (const result of artifactsWithMissingSignals) {
      console.error(`  - ${result.artifact}: ${result.missingSignals.join(", ")}`);
    }
  }

  const artifactsWithFailingSignals = results.filter((result) => result.failingSignals.length > 0);
  if (artifactsWithFailingSignals.length > 0) {
    console.error("\nFailing proof signals:");
    for (const result of artifactsWithFailingSignals) {
      console.error(`  - ${result.artifact}: ${result.failingSignals.join(", ")}`);
    }
  }

  console.error(`\nAggregate gate evidence written to ${outputPath}`);
}

function main() {
  const results = REQUIREMENTS.map(readArtifact);
  const aggregate = writeAggregate(results);

  if (!aggregate.passed) {
    printFailures(results, OUTPUT_RELATIVE_PATH);
    process.exit(1);
  }

  console.log("Friends-and-family beta readiness gate passed.");
  console.log(`Aggregate gate evidence written to ${OUTPUT_RELATIVE_PATH}`);
}

main();
