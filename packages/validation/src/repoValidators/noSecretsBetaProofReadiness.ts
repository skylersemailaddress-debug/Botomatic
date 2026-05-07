import fs from "node:fs";
import path from "node:path";
import type { RepoValidatorResult } from "../repoValidators";
import { writeNoSecretsBetaProof } from "../runtime/noSecretsBetaProof";

const REQUIRED_SIGNALS = [
  "source_secret_scan_passed",
  "git_history_secret_scan_passed",
  "release_evidence_secret_scan_passed",
  "logs_secret_scan_passed",
  "generated_apps_secret_scan_passed",
  "ui_api_secret_scan_passed",
] as const;

function result(ok: boolean, summary: string, checks: string[]): RepoValidatorResult {
  return { name: "Validate-Botomatic-NoSecretsBetaProofReadiness", status: ok ? "passed" : "failed", summary, checks };
}

export function validateNoSecretsBetaProofReadiness(root: string): RepoValidatorResult {
  const checks = [
    "packages/validation/src/runtime/noSecretsBetaProof.ts",
    "packages/validation/src/repoValidators/noSecretsBetaProofReadiness.ts",
    "packages/validation/src/tests/noSecretsBetaProof.test.ts",
    "release-evidence/runtime/no_secrets_beta_proof.json",
  ];

  if (!fs.existsSync(path.join(root, checks[0]))) {
    return result(false, "No-secrets beta proof scanner is missing.", checks);
  }

  const proof = writeNoSecretsBetaProof(root);
  const missingSignal = REQUIRED_SIGNALS.find((signal) => proof.signals[signal] !== true);
  if (missingSignal) {
    return result(false, `No-secrets beta proof failed required signal: ${missingSignal}.`, checks);
  }

  const patternNames = new Set(proof.pattern_names);
  const requiredPatterns = ["supabase_project_url", "supabase_service_role_jwt", "github_token", "openai_or_provider_key", "jwt_secret_assignment", "private_key_block", "committed_env_secret_value", "bearer_token"];
  const missingPattern = requiredPatterns.find((pattern) => !patternNames.has(pattern));
  if (missingPattern) {
    return result(false, `No-secrets scanner is missing required pattern family: ${missingPattern}.`, checks);
  }

  const scannerSrc = fs.readFileSync(path.join(root, checks[0]), "utf8");
  if (!scannerSrc.includes("isGitignoredLocalDevEnvFile")) {
    return result(false, "No-secrets scanner is missing isGitignoredLocalDevEnvFile guard — .env.local files would make source scans non-deterministic.", checks);
  }

  return result(
    true,
    `Generated friends-and-family no-secrets proof with source=${proof.scans.source.scannedFiles}, git_history=${proof.scans.git_history.scannedFiles}, release_evidence=${proof.scans.release_evidence.scannedFiles}, logs=${proof.scans.logs.scannedFiles}, generated_apps=${proof.scans.generated_apps.scannedFiles} scanned files; .env.local gitignored files excluded; UI/API redaction fixtures verified.`,
    checks,
  );
}
