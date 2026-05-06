import childProcess from "node:child_process";
import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";

export type NoSecretsSignalName =
  | "source_secret_scan_passed"
  | "git_history_secret_scan_passed"
  | "release_evidence_secret_scan_passed"
  | "logs_secret_scan_passed"
  | "generated_apps_secret_scan_passed"
  | "ui_api_secret_scan_passed";

export type SecretFinding = {
  category: string;
  pattern: string;
  file: string;
  line: number;
  fingerprint: string;
};

export type ScanResult = {
  clean: boolean;
  scannedFiles: number;
  findings: SecretFinding[];
  skipped: string[];
};

export type RedactionVerification = {
  clean: boolean;
  cases: Array<{ name: string; leaked: boolean; redacted: boolean }>;
  findings: SecretFinding[];
};

export type NoSecretsBetaProof = {
  generated_at: string;
  proof_type: "no_secrets_beta_proof";
  signals: Record<NoSecretsSignalName, boolean>;
  scans: Record<"source" | "git_history" | "release_evidence" | "logs" | "generated_apps", ScanResult>;
  redaction_verification: RedactionVerification;
  allowed_placeholders: string[];
  pattern_names: string[];
};

type SecretPattern = { name: string; regex: RegExp };

export const SECRET_PATTERNS: SecretPattern[] = [
  { name: "supabase_project_url", regex: /https:\/\/[a-z0-9]{18,}\.supabase\.co\b/gi },
  { name: "supabase_service_role_jwt", regex: /\beyJ[a-zA-Z0-9_-]{10,}\.[a-zA-Z0-9_-]{10,}\.[a-zA-Z0-9_-]{10,}\b/g },
  { name: "supabase_secret_key", regex: /\bsb_(?:secret|service_role)_[A-Za-z0-9_-]{16,}\b/g },
  { name: "github_token", regex: /\bgh[pousr]_[0-9A-Za-z_]{20,}\b/g },
  { name: "openai_or_provider_key", regex: /\b(?:sk-(?:proj-|admin-)?[A-Za-z0-9_-]{20,}|sk-ant-[A-Za-z0-9_-]{16,}|AIza[0-9A-Za-z_-]{20,}|xai-[A-Za-z0-9_-]{20,})\b/g },
  { name: "jwt_secret_assignment", regex: /\b(?:jwt[_-]?secret|nextauth[_-]?secret|session[_-]?secret)\s*[:=]\s*["']?[A-Za-z0-9_./+=-]{16,}["']?/gi },
  { name: "private_key_block", regex: /-----BEGIN (?:RSA |EC |OPENSSH |DSA )?PRIVATE KEY-----/g },
  { name: "committed_env_secret_value", regex: /^\s*(?:[A-Z0-9_]*(?:SECRET|TOKEN|PASSWORD|API_KEY|SERVICE_ROLE|PRIVATE_KEY)[A-Z0-9_]*)\s*=\s*(?!$|<[^>]+>$|secret:\/\/|replace_at_runtime$|changeme-only-if-non-secret$)[^\s#]{12,}\s*$/gim },
  { name: "bearer_token", regex: /\bBearer\s+(?!<[^>]+>)(?!\$\{[^}]+\})(?!\[REDACTED\])[A-Za-z0-9._\-]{16,}\b/g },
];

const TEXT_EXTENSIONS = new Set([
  ".cjs", ".conf", ".css", ".env", ".html", ".ini", ".js", ".json", ".jsx", ".md", ".mjs", ".rc", ".sql", ".toml", ".ts", ".tsx", ".txt", ".yaml", ".yml",
]);

const BINARY_EXTENSIONS = new Set([".png", ".jpg", ".jpeg", ".gif", ".webp", ".ico", ".pdf", ".zip", ".gz", ".mp4", ".mp3", ".wav", ".bin"]);
const DEFAULT_SKIP_DIRS = new Set([".git", "node_modules", "dist", "build", ".next", "coverage", ".cache"]);

const HISTORICAL_REMEDIATED_EXAMPLE_FINDINGS = new Set([
  "supabase_project_url:DEPLOY.md:c2ecce5e2c6aeabc",
  "bearer_token:packages/ui-preview-engine/src/tests/uiDataStateApiWiringNormalizer.test.ts:832874966eafb488",
  // Old test-example fingerprints (pre-DEPLOY-001 refactor)
  "openai_or_provider_key:packages/validation/src/tests/secretLeakPrevention.test.ts:894fcc12300916ee",
  "github_token:packages/validation/src/tests/secretLeakPrevention.test.ts:84886ca21ec4dab9",
  // Post-DEPLOY-001 synthetic test-example fingerprints (commit 1a318f49e58c)
  "openai_or_provider_key:packages/validation/src/tests/secretLeakPrevention.test.ts:90ba0790b3c585b8",
  "github_token:packages/validation/src/tests/secretLeakPrevention.test.ts:851ec3cfed8ba2d2",
]);

function isRemediatedHistoricalExample(finding: SecretFinding): boolean {
  const file = finding.file.replace(/^[0-9a-f]{12}:/, "");
  return HISTORICAL_REMEDIATED_EXAMPLE_FINDINGS.has(`${finding.pattern}:${file}:${finding.fingerprint}`);
}

const SAFE_PLACEHOLDERS = ["<REQUIRED_SECRET_REF>", "<required_secret_ref>", "<reviewer-token>", "<redacted>", "[REDACTED]", "secret://", "replace_at_runtime", "changeme-only-if-non-secret", "dev-api-token"];

function fingerprint(value: string): string {
  return crypto.createHash("sha256").update(value).digest("hex").slice(0, 16);
}

function isTextFile(rel: string): boolean {
  const base = path.basename(rel).toLowerCase();
  if (base === ".env" || base === ".env.example" || base.startsWith(".env.")) return true;
  const ext = path.extname(rel).toLowerCase();
  return TEXT_EXTENSIONS.has(ext) && !BINARY_EXTENSIONS.has(ext);
}

function shouldSkip(rel: string, extraSkipDirs: Set<string>): boolean {
  const parts = rel.split("/");
  return parts.some((part) => DEFAULT_SKIP_DIRS.has(part) || extraSkipDirs.has(part));
}

function collectFiles(root: string, targetRel: string, extraSkipDirs = new Set<string>()): string[] {
  const start = path.join(root, targetRel);
  const out: string[] = [];
  if (!fs.existsSync(start)) return out;
  const walk = (full: string) => {
    const stat = fs.statSync(full);
    const rel = path.relative(root, full).replace(/\\/g, "/");
    if (stat.isDirectory()) {
      if (rel && shouldSkip(rel, extraSkipDirs)) return;
      for (const entry of fs.readdirSync(full)) walk(path.join(full, entry));
      return;
    }
    if (stat.isFile() && isTextFile(rel)) out.push(rel);
  };
  walk(start);
  return out.sort();
}

export function redactSecretText(input: string): string {
  let output = input;
  for (const pattern of SECRET_PATTERNS) {
    output = output.replace(pattern.regex, (match) => {
      if (/^\s*[A-Z0-9_]+\s*=/.test(match)) {
        return match.replace(/=.*/, "=[REDACTED]");
      }
      if (/^Bearer\s+/i.test(match)) return "Bearer [REDACTED]";
      if (/^https:\/\//i.test(match)) return "https://[REDACTED].supabase.co";
      if (/PRIVATE KEY/.test(match)) return "-----BEGIN [REDACTED] PRIVATE KEY-----";
      return "[REDACTED]";
    });
  }
  return output;
}

export function scanText(category: string, file: string, text: string): SecretFinding[] {
  const findings: SecretFinding[] = [];
  for (const pattern of SECRET_PATTERNS) {
    pattern.regex.lastIndex = 0;
    let match: RegExpExecArray | null;
    while ((match = pattern.regex.exec(text)) !== null) {
      const matched = match[0];
      if (SAFE_PLACEHOLDERS.some((placeholder) => matched.includes(placeholder))) continue;
      const line = text.slice(0, match.index).split(/\r?\n/).length;
      findings.push({ category, pattern: pattern.name, file, line, fingerprint: fingerprint(matched) });
    }
  }
  return findings;
}

function scanRelFiles(root: string, category: string, files: string[], skipped: string[] = []): ScanResult {
  const findings: SecretFinding[] = [];
  for (const rel of files) {
    const text = fs.readFileSync(path.join(root, rel), "utf8");
    findings.push(...scanText(category, rel, text));
  }
  return { clean: findings.length === 0, scannedFiles: files.length, findings, skipped };
}

function scanGitHistory(root: string): ScanResult {
  if (!fs.existsSync(path.join(root, ".git"))) return { clean: true, scannedFiles: 0, findings: [], skipped: ["git history unavailable: .git directory not present"] };
  const skipped = ["release-evidence", "receipts", "node_modules", "dist", "build", ".next", "coverage", ".cache", "binary files", "exact remediated historical docs/test examples by fingerprint"];
  const revs = childProcess.execFileSync("git", ["rev-list", "--all"], { cwd: root, encoding: "utf8", stdio: ["ignore", "pipe", "ignore"] }).trim().split(/\r?\n/).filter(Boolean);
  const historyGrep = [
    "https://[a-z0-9]{18,}\\.supabase\\.co",
    "eyJ[A-Za-z0-9_-]{10,}\\.[A-Za-z0-9_-]{10,}\\.[A-Za-z0-9_-]{10,}",
    "sb_(secret|service_role)_[A-Za-z0-9_-]{16,}",
    "gh[pousr]_[0-9A-Za-z_]{20,}",
    "sk-(proj-|admin-)?[A-Za-z0-9_-]{20,}",
    "sk-ant-[A-Za-z0-9_-]{16,}",
    "AIza[0-9A-Za-z_-]{20,}",
    "xai-[A-Za-z0-9_-]{20,}",
    "(jwt[_-]?secret|nextauth[_-]?secret|session[_-]?secret)[[:space:]]*[:=][[:space:]]*[\"']?[A-Za-z0-9_./+=-]{16,}",
    "-----BEGIN (RSA |EC |OPENSSH |DSA )?PRIVATE KEY-----",
    "Bearer[[:space:]]+[A-Za-z0-9._-]{16,}",
  ].join("|");
  let output = "";
  try {
    output = childProcess.execFileSync(
      "git",
      ["grep", "-I", "-n", "-E", historyGrep, ...revs, "--", ".", ":(exclude)release-evidence", ":(exclude)receipts", ":(exclude)node_modules", ":(exclude)dist", ":(exclude)build", ":(exclude).next", ":(exclude)coverage", ":(exclude).cache", ":(exclude)package-lock.json"],
      { cwd: root, encoding: "utf8", stdio: ["ignore", "pipe", "ignore"], maxBuffer: 1024 * 1024 * 20 },
    );
  } catch (error: any) {
    if (typeof error?.stdout === "string") output = error.stdout;
  }
  const findings: SecretFinding[] = [];
  const seen = new Set<string>();
  for (const line of output.split(/\r?\n/).filter(Boolean)) {
    const parsed = line.match(/^([^:]+):([^:]+):(\d+):(.*)$/);
    if (!parsed) continue;
    const [, rev, rel, lineNo, text] = parsed;
    if (!isTextFile(rel) || shouldSkip(rel, new Set(["release-evidence", "receipts"]))) continue;
    for (const finding of scanText("git_history", `${rev.slice(0, 12)}:${rel}`, text)) {
      if (isRemediatedHistoricalExample(finding)) continue;
      const key = `${finding.pattern}:${finding.file}:${finding.line}:${finding.fingerprint}`;
      if (seen.has(key)) continue;
      seen.add(key);
      findings.push({ ...finding, line: Number(lineNo) });
      if (findings.length >= 100) return { clean: false, scannedFiles: revs.length, findings, skipped: [...skipped, "stopped after 100 git-history findings"] };
    }
  }
  return { clean: findings.length === 0, scannedFiles: revs.length, findings, skipped };
}

function verifyRedaction(): RedactionVerification {
  const samples = [
    { name: "runtime_log", value: `provider failed with OPENAI_API_KEY=${["sk", "proj", "abcdefghijklmnopqrstuvwxyz1234567890"].join("-")}` },
    { name: "api_response", value: JSON.stringify({ authorization: `Bearer ${["ghp", "abcdefghijklmnopqrstuvwxyz1234567890"].join("_")}`, supabaseUrl: `https://${"abcdefghijklmnopqrst"}.supabase.co` }) },
    { name: "ui_response", value: `JWT_SECRET=${"abcdefghijklmnopqrstuvwxyz123456"} and private key ${"-----BEGIN "}PRIVATE KEY-----` },
  ];
  const cases = samples.map((sample) => {
    const redacted = redactSecretText(sample.value);
    return { name: sample.name, leaked: scanText("ui_api_response", sample.name, redacted).length > 0, redacted: redacted !== sample.value && redacted.includes("[REDACTED]") };
  });
  const redactedPayload = samples.map((sample) => redactSecretText(sample.value)).join("\n");
  const findings = scanText("ui_api_response", "redacted-fixtures", redactedPayload);
  return { clean: findings.length === 0 && cases.every((item) => !item.leaked && item.redacted), cases, findings };
}

export function generateNoSecretsBetaProof(root: string): NoSecretsBetaProof {
  const sourceFiles = collectFiles(root, ".", new Set(["release-evidence", "receipts", "data"]));
  const releaseEvidenceFiles = collectFiles(root, "release-evidence", new Set(["generated-apps"])).filter((rel) => rel !== "release-evidence/runtime/no_secrets_beta_proof.json");
  const logFiles = [...collectFiles(root, "receipts"), ...collectFiles(root, "data")];
  const generatedAppFiles = collectFiles(root, "release-evidence/generated-apps");
  const scans = {
    source: scanRelFiles(root, "source", sourceFiles, ["release-evidence", "receipts", "data"]),
    git_history: scanGitHistory(root),
    release_evidence: scanRelFiles(root, "release_evidence", releaseEvidenceFiles, ["release-evidence/generated-apps", "release-evidence/runtime/no_secrets_beta_proof.json"]),
    logs: scanRelFiles(root, "logs", logFiles),
    generated_apps: scanRelFiles(root, "generated_apps", generatedAppFiles),
  };
  const redaction = verifyRedaction();
  const signals: Record<NoSecretsSignalName, boolean> = {
    source_secret_scan_passed: scans.source.clean,
    git_history_secret_scan_passed: scans.git_history.clean,
    release_evidence_secret_scan_passed: scans.release_evidence.clean,
    logs_secret_scan_passed: scans.logs.clean,
    generated_apps_secret_scan_passed: scans.generated_apps.clean,
    ui_api_secret_scan_passed: redaction.clean,
  };
  return {
    generated_at: new Date().toISOString(),
    proof_type: "no_secrets_beta_proof",
    signals,
    scans,
    redaction_verification: redaction,
    allowed_placeholders: SAFE_PLACEHOLDERS,
    pattern_names: SECRET_PATTERNS.map((pattern) => pattern.name),
  };
}

export function writeNoSecretsBetaProof(root: string): NoSecretsBetaProof {
  const proof = generateNoSecretsBetaProof(root);
  const out = path.join(root, "release-evidence", "runtime", "no_secrets_beta_proof.json");
  fs.mkdirSync(path.dirname(out), { recursive: true });
  fs.writeFileSync(out, `${JSON.stringify(proof, null, 2)}\n`, "utf8");
  return proof;
}

if (require.main === module) {
  const root = path.resolve(process.cwd());
  const proof = writeNoSecretsBetaProof(root);
  const ok = Object.values(proof.signals).every(Boolean);
  console.log(`${ok ? "PASS" : "FAIL"} — no-secrets beta proof written to release-evidence/runtime/no_secrets_beta_proof.json`);
  if (!ok) process.exit(1);
}
