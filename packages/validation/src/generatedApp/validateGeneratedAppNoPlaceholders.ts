import fs from "fs";
import path from "path";

export type GeneratedAppPlaceholderSeverity = "critical" | "high" | "medium" | "low";

export type GeneratedAppNoPlaceholderOptions = {
  scanTests?: boolean;
  includeMarkdown?: boolean;
  allowlistPaths?: string[];
  allowlistPatterns?: string[];
  maxFileSizeBytes?: number;
  rootLabel?: string;
};

export type GeneratedAppPlaceholderFinding = {
  filePath: string;
  line: number;
  column: number;
  severity: GeneratedAppPlaceholderSeverity;
  pattern: string;
  message: string;
};

export type GeneratedAppNoPlaceholderResult = {
  status: "passed" | "failed";
  scannedFiles: string[];
  skippedFiles: Array<{ filePath: string; reason: string }>;
  findings: GeneratedAppPlaceholderFinding[];
  summary: string;
};

type PatternDefinition = {
  pattern: RegExp;
  token: string;
  severity: GeneratedAppPlaceholderSeverity;
  message: string;
};

const DEFAULT_MAX_FILE_SIZE_BYTES = 1024 * 1024;

const SOURCE_EXTENSIONS = new Set([
  ".ts",
  ".tsx",
  ".js",
  ".jsx",
  ".vue",
  ".svelte",
  ".html",
  ".css",
  ".scss",
  ".json",
]);

const MARKDOWN_CANDIDATES = new Set(["README.md", "LAUNCH.md", "RUNBOOK.md"]);
const CONFIG_FILENAMES = new Set([
  ".env",
  ".env.production",
  ".env.example",
  "next.config.js",
  "next.config.mjs",
  "vite.config.ts",
  "vite.config.js",
  "vercel.json",
]);

const SKIP_DIR_NAMES = new Set([
  "node_modules",
  ".git",
  "dist",
  "build",
  ".next",
  "coverage",
  "snapshots",
]);

const TEST_DIR_NAMES = new Set(["__tests__", "tests", "test", "fixtures", "mocks"]);

const IMAGE_OR_BINARY_EXTENSIONS = new Set([
  ".png", ".jpg", ".jpeg", ".gif", ".webp", ".ico", ".bmp", ".tiff", ".svg", ".pdf", ".zip", ".gz", ".tar", ".woff", ".woff2", ".ttf", ".eot",
]);

const LOCKFILE_NAMES = new Set(["package-lock.json", "yarn.lock", "pnpm-lock.yaml", "bun.lockb"]);

const PATTERNS: PatternDefinition[] = [
  { pattern: /\bTODO\b/i, token: "TODO", severity: "high", message: "TODO marker found in production file." },
  { pattern: /\bFIXME\b/i, token: "FIXME", severity: "high", message: "FIXME marker found in production file." },
  { pattern: /\bplaceholder\b/i, token: "placeholder", severity: "high", message: "Placeholder marker found." },
  { pattern: /lorem ipsum/i, token: "lorem ipsum", severity: "high", message: "Lorem ipsum content found." },
  { pattern: /coming soon/i, token: "coming soon", severity: "high", message: "Coming soon marker found." },
  { pattern: /under construction/i, token: "under construction", severity: "high", message: "Under construction marker found." },
  { pattern: /not implemented/i, token: "not implemented", severity: "critical", message: "Not implemented marker found." },
  { pattern: /throw\s+new\s+Error\(("|')not implemented\1\)/i, token: "throw new Error(not implemented)", severity: "critical", message: "Explicit not implemented throw found." },
  { pattern: /fake\s+auth/i, token: "fake auth", severity: "critical", message: "Fake auth marker found." },
  { pattern: /mock\s+auth/i, token: "mock auth", severity: "high", message: "Mock auth marker found in production file." },
  { pattern: /fake\s+payment/i, token: "fake payment", severity: "critical", message: "Fake payment marker found." },
  { pattern: /mock\s+payment/i, token: "mock payment", severity: "high", message: "Mock payment marker found in production file." },
  { pattern: /fake\s+email/i, token: "fake email", severity: "critical", message: "Fake email marker found." },
  { pattern: /fake\s+sms/i, token: "fake SMS", severity: "critical", message: "Fake SMS marker found." },
  { pattern: /fake\s+integration/i, token: "fake integration", severity: "critical", message: "Fake integration marker found." },
  { pattern: /dummy\s+api\s+key/i, token: "dummy API key", severity: "critical", message: "Dummy API key marker found." },
  { pattern: /sample\s+api\s+key/i, token: "sample API key", severity: "high", message: "Sample API key marker found." },
  { pattern: /sk_test_[A-Za-z0-9]+/i, token: "sk_test_", severity: "critical", message: "Test payment key found in production file." },
  { pattern: /your-api-key-here/i, token: "your-api-key-here", severity: "critical", message: "Replaceable API key marker found." },
  { pattern: /replace me/i, token: "replace me", severity: "high", message: "Replace-me marker found." },
  { pattern: /\bexample\.com\b/i, token: "example.com", severity: "medium", message: "Example domain found in production config/content." },
  { pattern: /test@example\.com/i, token: "test@example.com", severity: "high", message: "Test contact email found in production flow." },
  { pattern: /\bJohn Doe\b/i, token: "John Doe", severity: "medium", message: "Placeholder customer seed name found." },
  { pattern: /\bJane Doe\b/i, token: "Jane Doe", severity: "medium", message: "Placeholder customer seed name found." },
  { pattern: /\bAcme Corp\b/i, token: "Acme Corp", severity: "medium", message: "Placeholder organization seed found." },
  { pattern: /demo data/i, token: "demo data", severity: "high", message: "Demo data marker found in production UI/content." },
  { pattern: /mock data/i, token: "mock data", severity: "high", message: "Mock data marker found in production UI/content." },
  { pattern: /stubbed response/i, token: "stubbed response", severity: "high", message: "Stubbed response marker found." },
  { pattern: /return\s+null\s*;/i, token: "return null", severity: "medium", message: "return null found; verify production handler completeness." },
  { pattern: /onSubmit\s*=\s*\{\s*\(\)\s*=>\s*\{\s*\}\s*\}/i, token: "onSubmit empty handler", severity: "high", message: "Empty submit handler found." },
  { pattern: /launch\s+disabled/i, token: "launch disabled", severity: "high", message: "Launch flow appears disabled." },
  { pattern: /payment\s+disabled/i, token: "payment disabled", severity: "high", message: "Payment flow appears disabled." },
  { pattern: /auth\s+disabled/i, token: "auth disabled", severity: "high", message: "Auth flow appears disabled." },
  { pattern: /email\s+disabled/i, token: "email disabled", severity: "high", message: "Email flow appears disabled." },
];

function toUnix(p: string): string {
  return p.split(path.sep).join("/");
}

function looksBinary(content: Buffer): boolean {
  const limit = Math.min(content.length, 8000);
  for (let idx = 0; idx < limit; idx += 1) {
    if (content[idx] === 0) return true;
  }
  return false;
}

function isAllowlisted(relPath: string, options: GeneratedAppNoPlaceholderOptions): boolean {
  const normalized = toUnix(relPath);
  if ((options.allowlistPaths || []).some((entry) => normalized.startsWith(toUnix(entry)))) {
    return true;
  }

  return (options.allowlistPatterns || []).some((pattern) => {
    try {
      return new RegExp(pattern).test(normalized);
    } catch {
      return false;
    }
  });
}

function shouldTreatAsProductionMarkdown(relPath: string): boolean {
  const base = path.basename(relPath);
  if (MARKDOWN_CANDIDATES.has(base)) return true;
  const lowered = toUnix(relPath).toLowerCase();
  return lowered.includes("launch") || lowered.includes("customer") || lowered.includes("readme");
}

function shouldScanFile(relPath: string, options: GeneratedAppNoPlaceholderOptions): { scan: boolean; reason?: string } {
  const normalized = toUnix(relPath);
  const segments = normalized.split("/");
  const fileName = segments[segments.length - 1] || "";
  const ext = path.extname(fileName).toLowerCase();

  if (segments.some((segment) => SKIP_DIR_NAMES.has(segment))) {
    return { scan: false, reason: "skip-directory" };
  }

  if (!options.scanTests && segments.some((segment) => TEST_DIR_NAMES.has(segment))) {
    return { scan: false, reason: "test-directory" };
  }

  if (LOCKFILE_NAMES.has(fileName)) {
    return { scan: false, reason: "lockfile" };
  }

  if (IMAGE_OR_BINARY_EXTENSIONS.has(ext)) {
    return { scan: false, reason: "binary-or-asset" };
  }

  if (SOURCE_EXTENSIONS.has(ext)) {
    return { scan: true };
  }

  if (ext === ".md") {
    if (!options.includeMarkdown) return { scan: false, reason: "markdown-disabled" };
    if (!shouldTreatAsProductionMarkdown(relPath)) return { scan: false, reason: "non-production-markdown" };
    return { scan: true };
  }

  if (CONFIG_FILENAMES.has(fileName)) {
    return { scan: true };
  }

  return { scan: false, reason: "unsupported-extension" };
}

function collectFindings(filePath: string, content: string): GeneratedAppPlaceholderFinding[] {
  const findings: GeneratedAppPlaceholderFinding[] = [];

  for (const rule of PATTERNS) {
    const matcher = new RegExp(rule.pattern.source, rule.pattern.flags.includes("g") ? rule.pattern.flags : `${rule.pattern.flags}g`);
    let match: RegExpExecArray | null;
    while ((match = matcher.exec(content)) !== null) {
      const idx = match.index;
      const before = content.slice(0, idx);
      const lines = before.split("\n");
      const line = lines.length;
      const column = lines[lines.length - 1].length + 1;
      findings.push({
        filePath,
        line,
        column,
        severity: rule.severity,
        pattern: rule.token,
        message: rule.message,
      });
      if (!matcher.global) break;
    }
  }

  return findings;
}

export function validateGeneratedAppNoPlaceholders(
  rootOrAppPath: string,
  options: GeneratedAppNoPlaceholderOptions = {}
): GeneratedAppNoPlaceholderResult {
  const root = path.resolve(rootOrAppPath);
  const scannedFiles: string[] = [];
  const skippedFiles: Array<{ filePath: string; reason: string }> = [];
  const findings: GeneratedAppPlaceholderFinding[] = [];
  const maxFileSizeBytes = options.maxFileSizeBytes ?? DEFAULT_MAX_FILE_SIZE_BYTES;

  if (!fs.existsSync(root)) {
    return {
      status: "failed",
      scannedFiles,
      skippedFiles,
      findings,
      summary: `Generated app root does not exist: ${root}`,
    };
  }

  const stack: string[] = [root];
  while (stack.length > 0) {
    const current = stack.pop();
    if (!current) continue;
    const stat = fs.statSync(current);

    if (stat.isDirectory()) {
      for (const entry of fs.readdirSync(current)) {
        stack.push(path.join(current, entry));
      }
      continue;
    }

    const rel = toUnix(path.relative(root, current));
    if (!rel || rel === ".") continue;

    if (isAllowlisted(rel, options)) {
      skippedFiles.push({ filePath: rel, reason: "allowlisted" });
      continue;
    }

    const decision = shouldScanFile(rel, options);
    if (!decision.scan) {
      skippedFiles.push({ filePath: rel, reason: decision.reason || "skipped" });
      continue;
    }

    if (stat.size > maxFileSizeBytes) {
      skippedFiles.push({ filePath: rel, reason: "max-size-exceeded" });
      continue;
    }

    const raw = fs.readFileSync(current);
    if (looksBinary(raw)) {
      skippedFiles.push({ filePath: rel, reason: "binary-content" });
      continue;
    }

    const text = raw.toString("utf8");
    scannedFiles.push(rel);
    findings.push(...collectFindings(rel, text));
  }

  const rootLabel = options.rootLabel || root;
  const status: "passed" | "failed" = findings.length === 0 ? "passed" : "failed";
  const summary = `${status.toUpperCase()} ${rootLabel}: scanned=${scannedFiles.length} skipped=${skippedFiles.length} findings=${findings.length}`;

  return {
    status,
    scannedFiles: scannedFiles.sort(),
    skippedFiles: skippedFiles.sort((a, b) => a.filePath.localeCompare(b.filePath)),
    findings: findings.sort((a, b) => `${a.filePath}:${a.line}:${a.column}`.localeCompare(`${b.filePath}:${b.line}:${b.column}`)),
    summary,
  };
}
