import fs from "fs";
import path from "path";
import type { RepoValidatorResult } from "../repoValidators";

const SECRET_PATTERNS: Array<{ name: string; regex: RegExp; configOnly?: boolean }> = [
  { name: "stripe_live", regex: /\bsk_live_[0-9A-Za-z]{10,}\b/ },
  { name: "github_pat", regex: /\bgh[pousr]_[0-9A-Za-z]{20,}\b/ },
  { name: "aws_access_key", regex: /\bAKIA[0-9A-Z]{16}\b/ },
  { name: "slack_token", regex: /\bxox[baprs]-[0-9A-Za-z-]{10,}\b/ },
  { name: "private_key_block", regex: /-----BEGIN (?:RSA |EC |OPENSSH )?PRIVATE KEY-----/ },
  { name: "jwt", regex: /\beyJ[a-zA-Z0-9_-]{8,}\.[a-zA-Z0-9_-]{8,}\.[a-zA-Z0-9_-]{8,}\b/ },
  { name: "openai_like", regex: /\bsk-[A-Za-z0-9]{20,}\b/ },
  { name: "anthropic_like", regex: /\bsk-ant-[A-Za-z0-9_-]{16,}\b/ },
  { name: "vercel_like", regex: /\bvercel_[A-Za-z0-9]{16,}\b/ },
  { name: "supabase_like", regex: /\bsb_(?:publishable|secret)_[A-Za-z0-9_-]{16,}\b/ },
  { name: "sendgrid_like", regex: /\bSG\.[A-Za-z0-9_-]{16,}\.[A-Za-z0-9_-]{16,}\b/ },
  { name: "twilio_like", regex: /\bSK[0-9a-fA-F]{32}\b/ },
  { name: "bearer_token", regex: /\bBearer\s+[A-Za-z0-9._\-]{16,}\b/ },
  { name: "generic_assignment", regex: /\b(?:secret|token|password|api[_-]?key)\s*[:=]\s*["']?[A-Za-z0-9_\-]{20,}["']?/i, configOnly: true },
];
const SCAN_EXTENSIONS = new Set([".md", ".json", ".yaml", ".yml", ".toml", ".ts", ".tsx", ".js", ".jsx", ".cjs", ".mjs", ".env", ".conf", ".ini", ".rc"]);
const SKIP_DIRS = new Set([".git", "node_modules", "dist", "build", ".next", "coverage", ".cache", "fixtures/generated-app-corpus"]);
const SKIP_FILE_PATTERNS = [/package-lock\.json$/, /pnpm-lock\.yaml$/, /yarn\.lock$/, /\.png$/, /\.jpg$/, /\.jpeg$/, /\.gif$/, /\.webp$/, /\.svg$/, /\.ico$/, /\.pdf$/, /\.zip$/, /\.gz$/, /\.mp4$/, /\.mp3$/, /\.wav$/, /\.bin$/, /\.test\./i, /\/tests?\//i, /\/__fixtures__\//i, /\/fixtures\//i];
const ALLOWED_PLACEHOLDERS = new Set(["<required_secret_ref>", "changeme-only-if-non-secret", "replace_at_runtime", ""]);
const REQUIRED_DOC_TERMS = ["static pattern scanning", "not exhaustive", "no \"zero leaks proven\" claim", "scan scope", "skip scope"];
const SECRET_REFERENCE_REQUIRED_TERMS = ["metadata_only", "secretValueStored", "secret://", "secretReferenceId", "secretUri", "buildDeploymentSecretPreflight"];

function has(root: string, rel: string): boolean { return fs.existsSync(path.join(root, rel)); }
function read(root: string, rel: string): string { return fs.readFileSync(path.join(root, rel), "utf8"); }
function result(ok: boolean, summary: string, checks: string[]): RepoValidatorResult { return { name: "Validate-Botomatic-SecretsCredentialManagementReadiness", status: ok ? "passed" : "failed", summary, checks }; }

function collectScanFiles(root: string, dir: string, out: string[]): void {
  if (!fs.existsSync(dir)) return;
  for (const entry of fs.readdirSync(dir)) {
    const full = path.join(dir, entry);
    const rel = path.relative(root, full).replace(/\\/g, "/");
    const stat = fs.statSync(full);
    if (stat.isDirectory()) {
      const dirName = path.basename(rel);
      if (SKIP_DIRS.has(rel) || SKIP_DIRS.has(dirName) || [...SKIP_DIRS].some((d) => rel.includes(`/${d}/`) || rel.startsWith(`${d}/`))) continue;
      collectScanFiles(root, full, out);
      continue;
    }
    const lower = rel.toLowerCase();
    if (SKIP_FILE_PATTERNS.some((p) => p.test(lower))) continue;
    const ext = path.extname(lower);
    if (path.basename(lower) === ".env.example" || lower === "readme.md" || (lower.startsWith("docs/") && ext === ".md") || SCAN_EXTENSIONS.has(ext)) out.push(rel);
  }
}

function hasDisallowedExampleSecret(line: string): boolean {
  const m = line.match(/^\s*[A-Za-z_][A-Za-z0-9_\-]*\s*=\s*(.*)$/);
  if (!m) return false;
  const raw = m[1].trim().replace(/^['"]|['"]$/g, "");
  const val = raw.toLowerCase();
  if (val.startsWith("secret://")) return false;
  if (ALLOWED_PLACEHOLDERS.has(val)) return false;
  if (SECRET_PATTERNS.some((p) => p.regex.test(raw))) return true;
  if (/^[A-Za-z0-9_\-]{12,}$/.test(raw) && /(key|token|secret|password)/i.test(line)) return true;
  return false;
}

export function validateSecretsCredentialManagementReadiness(root: string): RepoValidatorResult {
  const checks = ["packages/validation/src/repoValidators/secretsCredentialManagementReadiness.ts", "packages/validation/src/tests/secretLeakPrevention.test.ts", "docs/secret-leak-prevention.md", "packages/validation/src/runtime/secretsCredentialManagement.ts", "apps/control-plane/src/services/secrets.ts", ".env.example", ".gitignore"];
  for (const rel of checks) if (!has(root, rel)) return result(false, `Missing required DEPLOY-001 artifact: ${rel}`, checks);

  const model = read(root, "packages/validation/src/runtime/secretsCredentialManagement.ts");
  const uiService = read(root, "apps/control-plane/src/services/secrets.ts");
  const docs = read(root, "docs/secret-leak-prevention.md").toLowerCase();
  const gitignore = read(root, ".gitignore");

  if (!SECRET_REFERENCE_REQUIRED_TERMS.every((term) => model.includes(term) || uiService.includes(term))) return result(false, "Secret reference policy scope is weakened (missing metadata-only / URI-only semantics).", checks);
  if (!(gitignore.includes(".env") && gitignore.includes(".env.*") && gitignore.includes("!.env.example"))) return result(false, ".gitignore is missing required env-file protections.", checks);
  if (!REQUIRED_DOC_TERMS.every((t) => docs.includes(t))) return result(false, "Secret leak prevention docs must describe static scanning limits, overclaim guardrails, and scope/skips.", checks);

  for (const line of read(root, ".env.example").split(/\r?\n/)) {
    if (hasDisallowedExampleSecret(line)) return result(false, ".env.example contains non-placeholder secret-like values.", checks);
  }

  const files: string[] = [];
  collectScanFiles(root, root, files);
  for (const rel of files) {
    const text = read(root, rel);
    const ext = path.extname(rel.toLowerCase());
    const configExt = new Set([".env", ".json", ".yaml", ".yml", ".toml", ".ini", ".conf", ".rc"]);
    for (const p of SECRET_PATTERNS) {
      if (p.configOnly && !configExt.has(ext) && path.basename(rel.toLowerCase()) !== ".env.example") continue;
      if (p.regex.test(text)) return result(false, `Secret-like plaintext detected (${p.name}) in scanned file: ${rel}`, checks);
    }
  }
  return result(true, `DEPLOY-001 scope enforced with static secret pattern scanning across safe file set (scanned ${files.length} files) and explicit skip boundaries.`, checks);
}
