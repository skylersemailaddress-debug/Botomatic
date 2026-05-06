import fs from "node:fs";
import path from "node:path";
import type { RepoValidatorResult } from "../repoValidators";

const PROOF_RELATIVE_PATH = "release-evidence/runtime/deployment_smoke_beta_proof.json";
const MANIFEST_RELATIVE_PATH = "release-evidence/runtime/beta_environment_manifest.json";
const DOC_RELATIVE_PATH = "docs/beta/DEPLOYMENT_SMOKE_AND_ROLLBACK.md";
const SCRIPT_RELATIVE_PATH = "scripts/deploymentSmokeBetaProof.ts";
const REQUIRED_SIGNALS = [
  "beta_environment_manifest_present",
  "health_endpoint_passed",
  "auth_negative_path_passed",
  "project_route_smoke_passed",
  "rollback_documented_or_tested",
] as const;
const REQUIRED_ENV_VARS = ["BOTOMATIC_BETA_BASE_URL", "BOTOMATIC_BETA_AUTH_TOKEN", "BOTOMATIC_BETA_PROJECT_ID"] as const;
const MAX_LOCAL_SCOPE_AGE_DAYS = 30;

type JsonRecord = Record<string, any>;

function result(ok: boolean, summary: string, checks: string[]): RepoValidatorResult {
  return { name: "Validate-Botomatic-DeploymentSmokeBetaReadiness", status: ok ? "passed" : "failed", summary, checks };
}

function has(root: string, rel: string): boolean {
  return fs.existsSync(path.join(root, rel));
}

function read(root: string, rel: string): string {
  return fs.readFileSync(path.join(root, rel), "utf8");
}

function parseJson(root: string, rel: string): JsonRecord | null {
  try {
    const parsed = JSON.parse(read(root, rel));
    return parsed && typeof parsed === "object" && !Array.isArray(parsed) ? parsed : null;
  } catch {
    return null;
  }
}

function isFreshEnough(generatedAt: unknown): boolean {
  if (typeof generatedAt !== "string" || !generatedAt.trim()) return false;
  const timestamp = Date.parse(generatedAt);
  if (!Number.isFinite(timestamp)) return false;
  const ageMs = Date.now() - timestamp;
  return ageMs >= 0 && ageMs <= MAX_LOCAL_SCOPE_AGE_DAYS * 24 * 60 * 60 * 1000;
}

function signalPassing(value: unknown): boolean {
  if (value === true) return true;
  if (!value || typeof value !== "object" || Array.isArray(value)) return false;
  const record = value as JsonRecord;
  if (record.passed === true || record.ok === true || record.success === true || record.verified === true) return true;
  return typeof record.status === "string" && ["passed", "ok", "success"].includes(record.status.trim().toLowerCase());
}

function hasScopedOutLocalValidation(proof: JsonRecord): boolean {
  const scope = proof.localValidationScope;
  if (!scope || typeof scope !== "object" || Array.isArray(scope)) return false;
  return (
    proof.status === "local_validation_scoped_out" &&
    scope.deploymentProofOutsideLocalValidation === true &&
    typeof scope.documentedReason === "string" &&
    scope.documentedReason.includes("No live hosted friends-and-family beta URL") &&
    proof.documentation === DOC_RELATIVE_PATH &&
    proof.manifestPath === MANIFEST_RELATIVE_PATH &&
    isFreshEnough(proof.generatedAt)
  );
}

export function validateDeploymentSmokeBetaReadiness(root: string): RepoValidatorResult {
  const checks = [SCRIPT_RELATIVE_PATH, DOC_RELATIVE_PATH, MANIFEST_RELATIVE_PATH, PROOF_RELATIVE_PATH, "package.json"];

  const missingFiles = checks.slice(0, 4).filter((rel) => !has(root, rel));
  if (missingFiles.length > 0) {
    return result(false, `Deployment smoke beta readiness is missing files: ${missingFiles.join(", ")}.`, checks);
  }

  const packageJson = read(root, "package.json");
  if (!packageJson.includes('"proof:deployment-smoke"')) {
    return result(false, "package.json is missing the proof:deployment-smoke npm script.", checks);
  }

  const script = read(root, SCRIPT_RELATIVE_PATH);
  for (const envVar of REQUIRED_ENV_VARS) {
    if (!script.includes(envVar)) return result(false, `Deployment smoke script does not require ${envVar}.`, checks);
  }
  if (!script.includes("process.exit(1)") || !script.includes("No passing deployment smoke proof was written")) {
    return result(false, "Deployment smoke script must fail closed and clearly avoid passing proof writes when required env vars are absent.", checks);
  }

  const docs = read(root, DOC_RELATIVE_PATH).toLowerCase();
  if (!docs.includes("rollback procedure") || !docs.includes("post-rollback smoke") || !docs.includes("botomatic_beta_base_url")) {
    return result(false, "Deployment smoke/rollback documentation is missing env var or rollback procedure detail.", checks);
  }

  const manifest = parseJson(root, MANIFEST_RELATIVE_PATH);
  if (!manifest) return result(false, "Beta environment manifest JSON is invalid.", checks);
  const manifestEnv = Array.isArray(manifest.requiredEnvVars) ? manifest.requiredEnvVars.map(String) : [];
  const missingManifestEnv = REQUIRED_ENV_VARS.filter((envVar) => !manifestEnv.includes(envVar));
  if (missingManifestEnv.length > 0) {
    return result(false, `Beta environment manifest is missing env declarations: ${missingManifestEnv.join(", ")}.`, checks);
  }

  const proof = parseJson(root, PROOF_RELATIVE_PATH);
  if (!proof) return result(false, "Deployment smoke beta proof JSON is invalid.", checks);
  if (proof.pathId !== "deployment_smoke_beta") return result(false, "Deployment smoke beta proof has the wrong pathId.", checks);

  const signals = proof.signals && typeof proof.signals === "object" && !Array.isArray(proof.signals) ? proof.signals as JsonRecord : null;
  if (!signals) return result(false, "Deployment smoke beta proof is missing a signals object.", checks);

  const missingSignals = REQUIRED_SIGNALS.filter((signal) => !Object.prototype.hasOwnProperty.call(signals, signal));
  if (missingSignals.length > 0) {
    return result(false, `Deployment smoke beta proof is missing required signals: ${missingSignals.join(", ")}.`, checks);
  }

  const passingSignals = REQUIRED_SIGNALS.filter((signal) => signalPassing(signals[signal]));
  const liveProofPassed = proof.status === "passed" && proof.proofMode === "hosted_beta_http_smoke" && passingSignals.length === REQUIRED_SIGNALS.length && isFreshEnough(proof.generatedAt);
  if (liveProofPassed) {
    return result(true, "Fresh hosted beta deployment smoke proof is present with all required signals passing.", checks);
  }

  if (hasScopedOutLocalValidation(proof)) {
    return result(
      true,
      "Deployment smoke proof is intentionally scoped outside local validation because no hosted beta URL/token is available; the proof generator remains fail-closed for real hosted checks.",
      checks,
    );
  }

  return result(
    false,
    "Deployment smoke beta proof must either be a fresh passing hosted-beta HTTP proof or a fresh documented local-validation scope-out record.",
    checks,
  );
}
