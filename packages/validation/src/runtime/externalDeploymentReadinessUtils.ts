import fs from "fs";
import path from "path";

export const FAKE_INTEGRATION_TOKENS = [
  "fake auth",
  "fake payment",
  "fake integration",
  "mock payment",
  "mock auth",
  "stub integration",
  "dummy webhook",
  "not implemented",
  "coming soon",
  "todo integration",
];

export const SECRET_PATTERNS: Array<{ name: string; regex: RegExp }> = [
  { name: "AWS Access Key", regex: /AKIA[0-9A-Z]{16}/g },
  { name: "Private Key Block", regex: /-----BEGIN (RSA |EC |OPENSSH )?PRIVATE KEY-----/g },
  { name: "Stripe Live Key", regex: /sk_live_[0-9a-zA-Z]{10,}/g },
  { name: "GitHub Token", regex: /gh[pousr]_[0-9A-Za-z]{20,}/g },
  { name: "Slack Token", regex: /xox[baprs]-[0-9A-Za-z-]{10,}/g },
  { name: "Google API Key", regex: /AIza[0-9A-Za-z-_]{35}/g },
];

function listFilesRecursive(dir: string): string[] {
  if (!fs.existsSync(dir)) return [];
  const out: string[] = [];
  for (const entry of fs.readdirSync(dir)) {
    const full = path.join(dir, entry);
    const stat = fs.statSync(full);
    if (stat.isDirectory()) {
      out.push(...listFilesRecursive(full));
    } else {
      out.push(full);
    }
  }
  return out;
}

function isTextFile(filePath: string): boolean {
  return /\.(ts|tsx|js|jsx|json|md|txt|sql|yaml|yml|env|toml|ini|cfg)$/.test(filePath) || path.basename(filePath).includes("env");
}

export function scanFakeIntegrationLanguage(domainPath: string): { ok: boolean; issues: string[] } {
  const files = listFilesRecursive(domainPath);
  const issues: string[] = [];

  for (const filePath of files) {
    const rel = path.relative(domainPath, filePath).replace(/\\/g, "/");
    if (!isTextFile(filePath)) continue;

    // Production-path oriented scan.
    const productionLike = /^(app|src|auth|workflows|schema|openapi|repair|forms|components|lib|db)\//.test(rel);
    if (!productionLike) continue;

    const text = fs.readFileSync(filePath, "utf8").toLowerCase();
    for (const token of FAKE_INTEGRATION_TOKENS) {
      if (text.includes(token)) {
        issues.push(`${rel} contains fake-integration token: ${token}`);
      }
    }
  }

  return { ok: issues.length === 0, issues };
}

export function scanCommittedSecrets(domainPath: string): { ok: boolean; issues: string[] } {
  const files = listFilesRecursive(domainPath);
  const issues: string[] = [];

  for (const filePath of files) {
    const rel = path.relative(domainPath, filePath).replace(/\\/g, "/");
    if (!isTextFile(filePath)) continue;

    const base = path.basename(rel);
    const isExampleManifest = base.includes(".example") || base === ".env.example";
    const text = fs.readFileSync(filePath, "utf8");

    for (const pattern of SECRET_PATTERNS) {
      if (pattern.regex.test(text)) {
        issues.push(`${rel} matched secret pattern: ${pattern.name}`);
      }
      pattern.regex.lastIndex = 0;
    }

    // Disallow non-example env files with assignments.
    if (/\.env($|\.)/.test(base) && !isExampleManifest) {
      if (/^[A-Z0-9_]+\s*=\s*.+/m.test(text)) {
        issues.push(`${rel} appears to contain committed environment variable values`);
      }
    }
  }

  return { ok: issues.length === 0, issues };
}

export function readEnvManifestVars(domainPath: string, manifestPath: string | null): string[] {
  if (!manifestPath) return [];
  const full = path.join(domainPath, manifestPath);
  if (!fs.existsSync(full)) return [];
  const base = path.basename(manifestPath);

  if (base === ".env.example" || base.includes("env")) {
    const text = fs.readFileSync(full, "utf8");
    return text
      .split(/\r?\n/)
      .map((line) => line.trim())
      .filter((line) => line && !line.startsWith("#") && line.includes("="))
      .map((line) => line.split("=")[0].trim())
      .filter(Boolean);
  }

  if (base.endsWith(".json")) {
    try {
      const payload = JSON.parse(fs.readFileSync(full, "utf8"));
      return Array.isArray(payload?.envVars)
        ? payload.envVars.filter((v: any) => typeof v === "string")
        : [];
    } catch {
      return [];
    }
  }

  return [];
}

export function validateRequiredEnvVars(presentVars: string[], requiredVars: string[]): { ok: boolean; missing: string[] } {
  const set = new Set(presentVars);
  const missing = requiredVars.filter((name) => !set.has(name));
  return { ok: missing.length === 0, missing };
}

export function ensureJsonFile(filePath: string, payload: any) {
  fs.mkdirSync(path.dirname(filePath), { recursive: true });
  fs.writeFileSync(filePath, JSON.stringify(payload, null, 2));
}

export function summarizeOutput(text: string): string {
  const clean = String(text || "").trim();
  if (!clean) return "";
  const lines = clean.split(/\r?\n/).filter(Boolean).slice(0, 8);
  const summary = lines.join(" | ");
  return summary.length > 700 ? `${summary.slice(0, 700)}...` : summary;
}
