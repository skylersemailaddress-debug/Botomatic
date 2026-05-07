import { spawnSync } from "child_process";
import fs from "fs";
import path from "path";

const ROOT = process.cwd();
const REPORT_RELATIVE_PATH = "release-evidence/runtime/friends_family_beta_rc.json";
const OUTPUT_PATH = path.join(ROOT, REPORT_RELATIVE_PATH);
const MAX_OUTPUT_CHARS = 12_000;

type JsonValue = null | boolean | number | string | JsonValue[] | { [key: string]: JsonValue };

type CommandResult = {
  name: string;
  command: string;
  startedAt: string;
  finishedAt: string;
  durationMs: number;
  exitCode: number | null;
  signal: NodeJS.Signals | null;
  passed: boolean;
  stdoutTail: string;
  stderrTail: string;
  error?: string;
};

type RequiredProof = {
  artifact: string;
  label: string;
  requiredSignals: string[];
  allowLocalScopeOut?: boolean;
};

type ProofSummary = {
  artifact: string;
  label: string;
  exists: boolean;
  parseable: boolean;
  passed: boolean;
  missingSignals: string[];
  failingSignals: string[];
  generatedFakeProofDetected: boolean;
  localScopeOutDetected: boolean;
  generatedAt?: string;
  status?: string;
  error?: string;
};

type DocSummary = {
  path: string;
  exists: boolean;
  passed: boolean;
  heading?: string;
  bytes?: number;
  requiredPhrases: string[];
  missingPhrases: string[];
  error?: string;
};

const COMMANDS = [
  { name: "dependency/install sanity", command: "npm run -s deps:sanity" },
  { name: "build", command: "npm run -s build" },
  { name: "test", command: "npm run -s test" },
  { name: "lint", command: "npm run -s lint" },
  { name: "typecheck", command: "npm run -s typecheck" },
  { name: "validate:all", command: "npm run -s validate:all" },
  { name: "beta:readiness", command: "npm run -s beta:readiness" },
];

const REQUIRED_PROOFS: RequiredProof[] = [
  {
    artifact: "release-evidence/runtime/tenant_isolation_proof.json",
    label: "Tenant/project isolation proof",
    requiredSignals: [
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
    requiredSignals: [
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
    requiredSignals: [
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
    requiredSignals: [
      "intake_created_durable_project",
      "compile_created_build_contract",
      "plan_created_packets",
      "queue_claimed_job",
      "worker_executed_job",
      "materialized_output_verified",
      "validation_evidence_persisted",
      "restart_resume_no_duplicate_or_lost_work",
    ],
  },
  {
    artifact: "release-evidence/runtime/durable_fail_closed_beta_proof.json",
    label: "Durable storage outage fail-closed proof",
    requiredSignals: [
      "production_supabase_outage_blocks_startup_or_readiness",
      "beta_does_not_fallback_to_memory",
      "development_memory_fallback_explicit_only",
      "public_traffic_not_accepted_without_durable_repo",
    ],
  },
  {
    artifact: "release-evidence/runtime/deployment_smoke_beta_proof.json",
    label: "Hosted beta deployment smoke/rollback proof",
    requiredSignals: [
      "beta_environment_manifest_present",
      "health_endpoint_passed",
      "auth_negative_path_passed",
      "project_route_smoke_passed",
      "rollback_documented_or_tested",
    ],
  },
  {
    artifact: "release-evidence/runtime/beta_readiness_gate.json",
    label: "Aggregate beta readiness gate",
    requiredSignals: [],
  },
];

const REQUIRED_DOCS = [
  {
    path: "docs/beta/FRIENDS_AND_FAMILY_BETA_GATE.md",
    requiredPhrases: ["friends-and-family", "fail-closed", "proof"],
  },
  {
    path: "docs/beta/DEPLOYMENT_SMOKE_AND_ROLLBACK.md",
    requiredPhrases: ["deployment", "smoke", "rollback"],
  },
  {
    path: "docs/beta/RC_RUNBOOK.md",
    requiredPhrases: ["npm run beta:rc", "go/no-go", "friends-and-family"],
  },
];

function tail(value: string): string {
  return value.length <= MAX_OUTPUT_CHARS ? value : value.slice(value.length - MAX_OUTPUT_CHARS);
}

function runCommand(name: string, command: string): CommandResult {
  const startedAt = new Date().toISOString();
  const startMs = Date.now();
  const result = spawnSync(command, {
    cwd: ROOT,
    shell: true,
    encoding: "utf8",
    maxBuffer: 1024 * 1024 * 40,
    env: { ...process.env, NEXT_TELEMETRY_DISABLED: "1" },
  });
  const finishedAt = new Date().toISOString();
  const exitCode = typeof result.status === "number" ? result.status : null;

  return {
    name,
    command,
    startedAt,
    finishedAt,
    durationMs: Date.now() - startMs,
    exitCode,
    signal: result.signal,
    passed: exitCode === 0,
    stdoutTail: tail(result.stdout ?? ""),
    stderrTail: tail(result.stderr ?? ""),
    ...(result.error ? { error: result.error.message } : {}),
  };
}

function gitValue(command: string): string {
  const result = spawnSync(command, { cwd: ROOT, shell: true, encoding: "utf8" });
  return result.status === 0 ? result.stdout.trim() : "unknown";
}

function isRecord(value: JsonValue | undefined): value is { [key: string]: JsonValue } {
  return Boolean(value && typeof value === "object" && !Array.isArray(value));
}

function getSignalValue(document: JsonValue, signalName: string): JsonValue | undefined {
  if (!isRecord(document)) return undefined;
  if (isRecord(document.signals) && Object.prototype.hasOwnProperty.call(document.signals, signalName)) {
    return document.signals[signalName];
  }
  if (Object.prototype.hasOwnProperty.call(document, signalName)) return document[signalName];
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

  const passed = value.passed ?? value.pass ?? value.ok ?? value.success ?? value.verified;
  if (typeof passed === "boolean") return passed;
  if (typeof passed === "string") return passed.trim().length > 0 && !hasExplicitFailureString(passed);

  return Object.keys(value).length > 0;
}

function hasGeneratedFakeProofMarker(value: JsonValue): boolean {
  if (Array.isArray(value)) return value.some(hasGeneratedFakeProofMarker);
  if (!isRecord(value)) return false;

  for (const [key, nestedValue] of Object.entries(value)) {
    const normalizedKey = key.toLowerCase();
    if (["fake", "isfake", "fabricated", "generatedfakeproof", "syntheticproof"].includes(normalizedKey) && nestedValue === true) {
      return true;
    }
    if (["status", "proofmode", "source", "generator"].includes(normalizedKey) && typeof nestedValue === "string") {
      const normalizedValue = nestedValue.toLowerCase();
      if (
        normalizedValue === "fake" ||
        normalizedValue === "fabricated" ||
        normalizedValue === "placeholder" ||
        normalizedValue.includes("fake proof") ||
        normalizedValue.includes("fabricated proof")
      ) {
        return true;
      }
    }
    if (hasGeneratedFakeProofMarker(nestedValue)) return true;
  }

  return false;
}

function artifactStatus(document: JsonValue): string | undefined {
  return isRecord(document) && typeof document.status === "string" ? document.status : undefined;
}

function artifactGeneratedAt(document: JsonValue): string | undefined {
  if (!isRecord(document)) return undefined;
  if (typeof document.generatedAt === "string") return document.generatedAt;
  if (typeof document.generated_at === "string") return document.generated_at;
  return undefined;
}

function isLocalScopeOut(document: JsonValue): boolean {
  return isRecord(document) && document.status === "local_validation_scoped_out";
}

function summarizeProof(requirement: RequiredProof): ProofSummary {
  const absolutePath = path.join(ROOT, requirement.artifact);
  if (!fs.existsSync(absolutePath)) {
    return {
      artifact: requirement.artifact,
      label: requirement.label,
      exists: false,
      parseable: false,
      passed: false,
      missingSignals: requirement.requiredSignals,
      failingSignals: [],
      generatedFakeProofDetected: false,
      localScopeOutDetected: false,
      error: "Required proof artifact is missing.",
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
      missingSignals: requirement.requiredSignals,
      failingSignals: [],
      generatedFakeProofDetected: false,
      localScopeOutDetected: false,
      error: error instanceof Error ? error.message : String(error),
    };
  }

  const missingSignals = requirement.requiredSignals.filter((signal) => getSignalValue(parsed, signal) === undefined);
  const failingSignals = requirement.requiredSignals.filter((signal) => {
    const value = getSignalValue(parsed, signal);
    return value !== undefined && !isPassingSignal(value);
  });
  const status = artifactStatus(parsed);
  const fake = hasGeneratedFakeProofMarker(parsed);
  const localScopeOut = isLocalScopeOut(parsed);
  const aggregateGateFailed = requirement.artifact.endsWith("beta_readiness_gate.json") && isRecord(parsed) && parsed.passed !== true;

  return {
    artifact: requirement.artifact,
    label: requirement.label,
    exists: true,
    parseable: true,
    passed: missingSignals.length === 0 && failingSignals.length === 0 && !fake && !localScopeOut && !aggregateGateFailed,
    missingSignals,
    failingSignals,
    generatedFakeProofDetected: fake,
    localScopeOutDetected: localScopeOut,
    generatedAt: artifactGeneratedAt(parsed),
    status,
    ...(aggregateGateFailed ? { error: "Aggregate beta readiness gate did not report passed=true." } : {}),
  };
}

function summarizeDoc(doc: (typeof REQUIRED_DOCS)[number]): DocSummary {
  const absolutePath = path.join(ROOT, doc.path);
  if (!fs.existsSync(absolutePath)) {
    return {
      path: doc.path,
      exists: false,
      passed: false,
      requiredPhrases: doc.requiredPhrases,
      missingPhrases: doc.requiredPhrases,
      error: "Required beta document is missing.",
    };
  }

  const content = fs.readFileSync(absolutePath, "utf8");
  const missingPhrases = doc.requiredPhrases.filter((phrase) => !content.toLowerCase().includes(phrase.toLowerCase()));
  const heading = content.match(/^#\s+(.+)$/m)?.[1];
  return {
    path: doc.path,
    exists: true,
    passed: Boolean(heading) && content.trim().length > 0 && missingPhrases.length === 0,
    heading,
    bytes: Buffer.byteLength(content, "utf8"),
    requiredPhrases: doc.requiredPhrases,
    missingPhrases,
  };
}

function collectNoGoReasons(commandResults: CommandResult[], proofSummary: ProofSummary[], docsSummary: DocSummary[]): string[] {
  const reasons: string[] = [];

  for (const result of commandResults.filter((item) => !item.passed)) {
    reasons.push(`Command failed: ${result.name} (${result.command}) exited ${result.exitCode ?? result.signal ?? "unknown"}.`);
  }

  for (const proof of proofSummary) {
    if (!proof.exists) reasons.push(`Missing proof artifact: ${proof.artifact}.`);
    else if (!proof.parseable) reasons.push(`Unparseable proof artifact: ${proof.artifact}.`);
    else if (proof.generatedFakeProofDetected) reasons.push(`Generated/fake proof marker detected: ${proof.artifact}.`);
    else if (proof.localScopeOutDetected) reasons.push(`Proof artifact is locally scoped out, not a live passing proof: ${proof.artifact}.`);
    else if (proof.missingSignals.length > 0) reasons.push(`Missing proof signals in ${proof.artifact}: ${proof.missingSignals.join(", ")}.`);
    else if (proof.failingSignals.length > 0) reasons.push(`Failing proof signals in ${proof.artifact}: ${proof.failingSignals.join(", ")}.`);
    else if (!proof.passed) reasons.push(`Proof artifact did not pass final RC validation: ${proof.artifact}.`);
  }

  for (const doc of docsSummary) {
    if (!doc.exists) reasons.push(`Missing beta document: ${doc.path}.`);
    else if (doc.missingPhrases.length > 0) reasons.push(`Beta document is missing required RC content (${doc.path}): ${doc.missingPhrases.join(", ")}.`);
    else if (!doc.passed) reasons.push(`Beta document did not pass final RC validation: ${doc.path}.`);
  }

  return reasons;
}

function main() {
  const timestamp = new Date().toISOString();
  const commandResults = COMMANDS.map(({ name, command }) => {
    console.log(`\n[beta:rc] Running ${name}: ${command}`);
    const result = runCommand(name, command);
    console.log(`[beta:rc] ${result.passed ? "PASS" : "FAIL"} ${name} (${result.durationMs}ms)`);
    return result;
  });

  const proofArtifactSummary = REQUIRED_PROOFS.map(summarizeProof);
  const docsSummary = REQUIRED_DOCS.map(summarizeDoc);
  const noGoReasons = collectNoGoReasons(commandResults, proofArtifactSummary, docsSummary);
  const finalGo = noGoReasons.length === 0;

  const report = {
    gate: "friends_and_family_beta_release_candidate",
    timestamp,
    gitSha: gitValue("git rev-parse HEAD"),
    branch: gitValue("git rev-parse --abbrev-ref HEAD"),
    commandResults,
    proofArtifactSummary,
    docsSummary,
    finalDecision: finalGo ? "go" : "no-go",
    finalGo,
    noGoReasons,
  };

  fs.mkdirSync(path.dirname(OUTPUT_PATH), { recursive: true });
  fs.writeFileSync(OUTPUT_PATH, `${JSON.stringify(report, null, 2)}\n`, "utf8");

  console.log(`\n[beta:rc] Final decision: ${report.finalDecision.toUpperCase()}`);
  console.log(`[beta:rc] Report written to ${REPORT_RELATIVE_PATH}`);
  if (!finalGo) {
    console.error("[beta:rc] No-go reasons:");
    for (const reason of noGoReasons) console.error(`  - ${reason}`);
    process.exit(1);
  }
}

main();
