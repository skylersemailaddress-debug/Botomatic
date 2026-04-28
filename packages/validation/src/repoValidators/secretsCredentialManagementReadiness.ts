import fs from "fs";
import path from "path";
import type { RepoValidatorResult } from "../repoValidators";

const SECRET_LIKE_PATTERNS: Array<{ id: string; pattern: RegExp }> = [
  { id: "stripe_live", pattern: /\bsk_live_[0-9a-zA-Z]{10,}\b/ },
  { id: "github_pat", pattern: /\bgh[pousr]_[0-9A-Za-z]{20,}\b/ },
  { id: "aws_access_key", pattern: /\bAKIA[0-9A-Z]{16}\b/ },
  { id: "slack_token", pattern: /\bxox[baprs]-[0-9A-Za-z-]{10,}\b/ },
  { id: "private_key", pattern: /-----BEGIN (?:RSA |EC |OPENSSH )?PRIVATE KEY-----/ },
  { id: "jwt", pattern: /\beyJ[a-zA-Z0-9_-]{8,}\.[a-zA-Z0-9_-]{8,}\.[a-zA-Z0-9_-]{8,}\b/ },
  { id: "openai", pattern: /\bsk-[A-Za-z0-9]{20,}\b/ },
  { id: "anthropic", pattern: /\bsk-ant-[A-Za-z0-9\-_]{20,}\b/ },
  { id: "vercel", pattern: /\b(?:vercel|vcl)_[A-Za-z0-9]{18,}\b/i },
  { id: "supabase", pattern: /\bsb(?:p|s)_[A-Za-z0-9]{20,}\b/ },
  { id: "sendgrid", pattern: /\bSG\.[A-Za-z0-9_-]{16,}\.[A-Za-z0-9_-]{16,}\b/ },
  { id: "twilio", pattern: /\bSK[0-9a-fA-F]{32}\b/ },
  { id: "generic_bearer", pattern: /\bBearer\s+[A-Za-z0-9._\-]{20,}\b/ },
];

const ASSIGNMENT_KEY_PATTERN = /(api[_-]?key|secret|token|password|auth[_-]?token|access[_-]?token|client[_-]?secret)/i;
const SAFE_PLACEHOLDER_PATTERNS = [/^\s*$/, /^secret:\/\/[\w./:-]+$/i, /^<REQUIRED_SECRET_REF>$/i, /^changeme-only-if-non-secret$/i, /^replace_at_runtime$/i];

const SCANNED_FILE_PATTERNS = [
  /^\.env\.example$/,
  /^README\.md$/i,
  /^docs\/.*\.md$/i,
  /\.(json|ya?ml|toml)$/i,
  /\.(ts|tsx|js|jsx|cjs|mjs)$/i,
  /\.(config\.(ts|js|mjs|cjs)|rc)$/i,
];

const SKIP_DIR_NAMES = new Set([".git", "node_modules", "dist", "build", ".next", "coverage", ".cache"]);
const SKIP_PATH_PATTERNS = [/\.(png|jpg|jpeg|gif|webp|ico|svg|pdf|zip|gz|tar|woff2?|ttf|eot|mp4|mp3|mov|avi|wasm)$/i, /package-lock\.json$/i, /pnpm-lock\.ya?ml$/i, /yarn\.lock$/i, /^fixtures\/generated-app-corpus\//, /\/tests?\//i, /\.test\.[jt]sx?$/i];

function has(root: string, rel: string): boolean { return fs.existsSync(path.join(root, rel)); }
function read(root: string, rel: string): string { return fs.readFileSync(path.join(root, rel), "utf8"); }
function result(ok: boolean, summary: string, checks: string[]): RepoValidatorResult { return { name: "Validate-Botomatic-SecretsCredentialManagementReadiness", status: ok ? "passed" : "failed", summary, checks }; }

function shouldScan(relPath: string): boolean {
  if (SKIP_PATH_PATTERNS.some((p) => p.test(relPath))) return false;
  return SCANNED_FILE_PATTERNS.some((p) => p.test(relPath));
}

function listScannableFiles(root: string, dir: string, out: string[] = []): string[] {
  if (!fs.existsSync(dir)) return out;
  for (const entry of fs.readdirSync(dir)) {
    const full = path.join(dir, entry);
    const rel = path.relative(root, full).replace(/\\/g, "/");
    const stat = fs.statSync(full);
    if (stat.isDirectory()) {
      if (SKIP_DIR_NAMES.has(entry) || SKIP_PATH_PATTERNS.some((p) => p.test(rel + "/"))) continue;
      listScannableFiles(root, full, out);
      continue;
    }
    if (shouldScan(rel)) out.push(full);
  }
  return out;
}

function validateExampleAssignments(relPath: string, content: string): string[] {
  if (!/(\.env\.example$|example|template)/i.test(relPath)) return [];
  const findings: string[] = [];
  for (const line of content.split(/\r?\n/)) {
    if (!line || line.trim().startsWith("#") || !line.includes("=")) continue;
    const [rawKey, ...rest] = line.split("=");
    const key = rawKey.trim();
    const value = rest.join("=").trim();
    if (!ASSIGNMENT_KEY_PATTERN.test(key)) continue;
    if (SAFE_PLACEHOLDER_PATTERNS.some((p) => p.test(value))) continue;
    if (SECRET_LIKE_PATTERNS.some((item) => item.pattern.test(value)) || value.length >= 16) {
      findings.push(`${key} has non-placeholder value in ${relPath}`);
    }
  }
  return findings;
}

export function validateSecretsCredentialManagementReadiness(root: string): RepoValidatorResult {
  const checks = ["packages/validation/src/runtime/secretsCredentialManagement.ts","packages/validation/src/runtime/proofSecretsCredentialManagement.ts","packages/validation/src/repoValidators/secretsCredentialManagementReadiness.ts","release-evidence/runtime/secrets_credential_management_readiness_proof.json","apps/control-plane/src/components/overview/SecretsCredentialsPanel.tsx","apps/control-plane/src/services/secrets.ts","apps/control-plane/src/components/overview/DeploymentPanel.tsx","apps/control-plane/src/app/projects/[projectId]/vault/page.tsx",".gitignore", ".env.example", "LEGAL_CLAIM_BOUNDARIES.md", "EVIDENCE_BOUNDARY_POLICY.md", "docs/secret-leak-prevention.md"];
  for (const rel of checks) if (!has(root, rel)) return result(false, `Missing required secrets credential management file: ${rel}`, checks);
  const gitignore = read(root, ".gitignore");
  const envExample = read(root, ".env.example");
  const docs = read(root, "docs/secret-leak-prevention.md").toLowerCase();

  if (!(gitignore.includes(".env") && gitignore.includes(".env.*") && gitignore.includes("!.env.example"))) return result(false, ".gitignore does not protect environment files with explicit example-file exceptions.", checks);

  const files = listScannableFiles(root, root);
  const findings: string[] = [];
  for (const filePath of files) {
    const rel = path.relative(root, filePath).replace(/\\/g, "/");
    const content = fs.readFileSync(filePath, "utf8");
    for (const item of SECRET_LIKE_PATTERNS) if (item.pattern.test(content)) findings.push(`${rel} matched ${item.id}`);
    for (const line of content.split(/\r?\n/)) {
      if (!line.includes("=")) continue;
      const [k, ...v] = line.split("=");
      const key = k.trim();
      const value = v.join("=").trim();
      if (!ASSIGNMENT_KEY_PATTERN.test(key)) continue;
      if (SAFE_PLACEHOLDER_PATTERNS.some((p) => p.test(value)) || value.includes("secret://")) continue;
      if (/^[A-Za-z0-9._\-]{24,}$/.test(value)) findings.push(`${rel} contains high-risk token-like assignment in ${key}`);
    }
    findings.push(...validateExampleAssignments(rel, content));
  }

  findings.push(...validateExampleAssignments(".env.example", envExample));

  if (!docs.includes("static pattern scanning") || !docs.includes("not exhaustive")) return result(false, "Secret leak prevention docs must include static-scan scope caveats and non-exhaustive wording.", checks);
  if (docs.includes("guaranteed zero leaks")) return result(false, "Secret leak prevention docs contain overclaim language.", checks);

  if (findings.length) return result(false, `Secret leak prevention scan flagged ${findings.length} finding(s). Scope=${files.length} files. First: ${findings[0]}`, checks);

  return result(true, `Secrets credential management readiness is fail-closed with static pattern scanning across ${files.length} repository text/config/docs files; this is non-exhaustive and evidence-bounded.`, checks);
}
