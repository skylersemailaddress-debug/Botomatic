import fs from "fs";
import path from "path";
import type { RepoValidatorResult } from "../repoValidators";

const SECRET_LIKE_PATTERNS: RegExp[] = [
  /sk_live_[0-9a-zA-Z]{10,}/,
  /gh[pousr]_[0-9A-Za-z]{20,}/,
  /AKIA[0-9A-Z]{16}/,
  /xox[baprs]-[0-9A-Za-z-]{10,}/,
  /-----BEGIN (?:RSA |EC |OPENSSH )?PRIVATE KEY-----/,
  /eyJ[a-zA-Z0-9_-]{8,}\.[a-zA-Z0-9_-]{8,}\.[a-zA-Z0-9_-]{8,}/,
];

function has(root: string, rel: string): boolean {
  return fs.existsSync(path.join(root, rel));
}

function read(root: string, rel: string): string {
  return fs.readFileSync(path.join(root, rel), "utf8");
}

function result(ok: boolean, summary: string, checks: string[]): RepoValidatorResult {
  return {
    name: "Validate-Botomatic-SecretsCredentialManagementReadiness",
    status: ok ? "passed" : "failed",
    summary,
    checks,
  };
}

function listFilesRecursive(dir: string): string[] {
  if (!fs.existsSync(dir)) return [];
  const out: string[] = [];
  for (const entry of fs.readdirSync(dir)) {
    const full = path.join(dir, entry);
    const stat = fs.statSync(full);
    if (stat.isDirectory()) out.push(...listFilesRecursive(full));
    else out.push(full);
  }
  return out;
}

function containsSecretLikeValue(text: string): boolean {
  return SECRET_LIKE_PATTERNS.some((pattern) => pattern.test(text));
}

export function validateSecretsCredentialManagementReadiness(root: string): RepoValidatorResult {
  const checks = [
    "packages/validation/src/runtime/secretsCredentialManagement.ts",
    "packages/validation/src/runtime/proofSecretsCredentialManagement.ts",
    "packages/validation/src/repoValidators/secretsCredentialManagementReadiness.ts",
    "release-evidence/runtime/secrets_credential_management_readiness_proof.json",
    "apps/control-plane/src/components/overview/SecretsCredentialsPanel.tsx",
    "apps/control-plane/src/services/secrets.ts",
    "apps/control-plane/src/components/overview/DeploymentPanel.tsx",
    "apps/control-plane/src/app/projects/[projectId]/vault/page.tsx",
    ".gitignore",
  ];

  for (const rel of checks) {
    if (!has(root, rel)) {
      return result(false, `Missing required secrets credential management file: ${rel}`, checks);
    }
  }

  const model = read(root, "packages/validation/src/runtime/secretsCredentialManagement.ts");
  const uiService = read(root, "apps/control-plane/src/services/secrets.ts");
  const uiPanel = read(root, "apps/control-plane/src/components/overview/SecretsCredentialsPanel.tsx");
  const deploymentPanel = read(root, "apps/control-plane/src/components/overview/DeploymentPanel.tsx");
  const vaultPage = read(root, "apps/control-plane/src/app/projects/[projectId]/vault/page.tsx");
  const gitignore = read(root, ".gitignore");

  const requiredModelFields = [
    "secretReferenceId",
    "providerId",
    "environment",
    "keyName",
    "displayName",
    "requiredFor",
    "status",
    "fingerprint",
    "lastUpdatedAt",
    "lastRotatedAt",
    "rotationPolicyDays",
    "source",
    "secretUri",
  ];

  if (!requiredModelFields.every((field) => model.includes(field))) {
    return result(false, "Secret reference model is missing required fields.", checks);
  }

  const requiredFunctions = [
    "addSecretReference",
    "updateSecretReference",
    "rotateSecretReference",
    "disableSecretReference",
    "deleteSecretReference",
    "listCredentialProfiles",
    "listMissingRequiredSecrets",
    "buildDeploymentSecretPreflight",
  ];

  if (!requiredFunctions.every((fn) => model.includes(`export function ${fn}`))) {
    return result(false, "Secret workflow functions are missing from reusable model.", checks);
  }

  if (!uiService.includes("status: \"metadata_only\"") || !uiService.includes("secretValueStored: false")) {
    return result(false, "Storage policy does not enforce metadata_only and secretValueStored=false semantics.", checks);
  }

  const hasProfiles = [
    "vercel",
    "supabase",
    "github",
    "openai",
    "anthropic",
    "stripe",
    "twilio",
    "sendgrid",
    "roblox",
    "steam",
    "generic_http_api",
  ].every((provider) => model.includes(`\"${provider}\"`) || uiService.includes(`\"${provider}\"`));

  if (!hasProfiles) {
    return result(false, "Credential profiles are incomplete.", checks);
  }

  const envProtected =
    gitignore.includes(".env") &&
    gitignore.includes(".env.*") &&
    gitignore.includes("!.env.example");

  if (!envProtected) {
    return result(false, ".gitignore does not protect environment files with explicit example-file exceptions.", checks);
  }

  if (!uiPanel.includes("Secrets & Credentials") || !vaultPage.includes("<SecretsCredentialsPanel")) {
    return result(false, "Secrets & Credentials UI surface is missing or not mounted.", checks);
  }

  if (!uiPanel.toLowerCase().includes("live deployment still requires explicit approval")) {
    return result(false, "UI caveat for approval requirement is missing.", checks);
  }

  if (!deploymentPanel.includes("buildDeploymentSecretPreflight")) {
    return result(false, "Deployment preflight panel does not include secret status integration.", checks);
  }

  const hasAuditEventModel = model.includes("type SecretAuditEvent") && uiService.includes("type SecretAuditEvent");
  if (!hasAuditEventModel) {
    return result(false, "Secret audit event model is missing.", checks);
  }

  let proof: any;
  try {
    proof = JSON.parse(read(root, "release-evidence/runtime/secrets_credential_management_readiness_proof.json"));
  } catch {
    return result(false, "Secrets credential management proof artifact is invalid JSON.", checks);
  }

  if (proof?.status !== "passed") return result(false, "Secrets credential management proof status is not passed.", checks);
  if (proof?.noPlaintextSecretsStored !== true) return result(false, "Proof must assert noPlaintextSecretsStored=true.", checks);
  if (proof?.noSecretsCommitted !== true) return result(false, "Proof must assert noSecretsCommitted=true.", checks);
  if (proof?.proofArtifactsScanned !== true) return result(false, "Proof must assert proofArtifactsScanned=true.", checks);
  if (proof?.deploymentPreflightIncludesSecrets !== true) return result(false, "Proof must assert deploymentPreflightIncludesSecrets=true.", checks);
  if (proof?.liveDeploymentBlockedWhenSecretsMissing !== true) return result(false, "Proof must assert liveDeploymentBlockedWhenSecretsMissing=true.", checks);
  if (proof?.auditEventsRedacted !== true) return result(false, "Proof must assert auditEventsRedacted=true.", checks);

  if (!Array.isArray(proof?.secretReferenceExamples) || proof.secretReferenceExamples.length < 1) {
    return result(false, "Proof must include secretReferenceExamples.", checks);
  }

  const usesOnlySecretUris = proof.secretReferenceExamples.every((item: any) =>
    typeof item?.secretUri === "string" && item.secretUri.startsWith("secret://")
  );
  if (!usesOnlySecretUris) {
    return result(false, "Proof secretReferenceExamples must use secret:// URIs only.", checks);
  }

  const runtimeFiles = listFilesRecursive(path.join(root, "release-evidence", "runtime")).filter((filePath) =>
    /\.(json|md|txt|log)$/i.test(filePath)
  );

  for (const filePath of runtimeFiles) {
    const content = fs.readFileSync(filePath, "utf8");
    if (containsSecretLikeValue(content)) {
      return result(false, `Secret-like plaintext detected in runtime evidence: ${path.relative(root, filePath)}`, checks);
    }
  }

  return result(
    true,
    "Secrets and credential management readiness is fail-closed: metadata-only secret references, profile coverage, redacted audit trails, preflight secret gating, and blocked live execution when required secrets are missing.",
    checks
  );
}
