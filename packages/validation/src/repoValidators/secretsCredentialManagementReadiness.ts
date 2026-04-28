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

const SECRET_REFERENCE_REQUIRED_TERMS = [
  "metadata_only",
  "secretValueStored",
  "false",
  "secret://",
  "secretReferenceId",
  "secretUri",
  "buildDeploymentSecretPreflight",
];

function has(root: string, rel: string): boolean { return fs.existsSync(path.join(root, rel)); }
function read(root: string, rel: string): string { return fs.readFileSync(path.join(root, rel), "utf8"); }

function result(ok: boolean, summary: string, checks: string[]): RepoValidatorResult {
  return { name: "Validate-Botomatic-SecretsCredentialManagementReadiness", status: ok ? "passed" : "failed", summary, checks };
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

function containsSecretLikeValue(text: string): boolean { return SECRET_LIKE_PATTERNS.some((pattern) => pattern.test(text)); }

export function validateSecretsCredentialManagementReadiness(root: string): RepoValidatorResult {
  const checks = [
    "packages/validation/src/repoValidators/secretsCredentialManagementReadiness.ts",
    "packages/validation/src/tests/secretLeakPrevention.test.ts",
    "docs/secret-leak-prevention.md",
    "packages/validation/src/runtime/secretsCredentialManagement.ts",
    "apps/control-plane/src/services/secrets.ts",
    "release-evidence/runtime/secrets_credential_management_readiness_proof.json",
    ".gitignore",
  ];

  for (const rel of checks) {
    if (!has(root, rel)) return result(false, `Missing required DEPLOY-001 artifact: ${rel}`, checks);
  }

  const model = read(root, "packages/validation/src/runtime/secretsCredentialManagement.ts");
  const uiService = read(root, "apps/control-plane/src/services/secrets.ts");
  const docs = read(root, "docs/secret-leak-prevention.md").toLowerCase();
  const gitignore = read(root, ".gitignore");

  if (!SECRET_REFERENCE_REQUIRED_TERMS.every((term) => model.includes(term) || uiService.includes(term))) {
    return result(false, "Secret reference policy scope is weakened (missing metadata-only / URI-only semantics).", checks);
  }

  if (!docs.includes("scope") || !docs.includes("non-goals") || !docs.includes("metadata-only")) {
    return result(false, "DEPLOY-001 documentation must state scope, non-goals, and plaintext-secret prohibition.", checks);
  }

  if (!(gitignore.includes(".env") && gitignore.includes(".env.*") && gitignore.includes("!.env.example"))) {
    return result(false, ".gitignore is missing required env-file protections.", checks);
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

  return result(true, "DEPLOY-001 scope is enforced: metadata-only secret references, no plaintext secret values, and scoped leak prevention checks are active.", checks);
}
