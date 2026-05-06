import fs from "fs";
import path from "path";

const ROOT = process.cwd();

type LintCheck = {
  name: string;
  passed: boolean;
  detail: string;
};

const REQUIRED_SCRIPTS = [
  "deps:sanity",
  "build",
  "test",
  "lint",
  "typecheck",
  "validate:all",
  "beta:readiness",
  "beta:rc",
];

const REQUIRED_DOCS = [
  "docs/beta/DEPLOYMENT_SMOKE_AND_ROLLBACK.md",
  "docs/beta/FRIENDS_AND_FAMILY_BETA_GATE.md",
  "docs/beta/RC_RUNBOOK.md",
];

const REQUIRED_JSON = [
  "package.json",
  "package-lock.json",
  "apps/control-plane/package.json",
  "apps/orchestrator-api/package.json",
  "release-evidence/runtime/tenant_isolation_proof.json",
  "release-evidence/runtime/security_auth_beta_proof.json",
  "release-evidence/runtime/no_secrets_beta_proof.json",
  "release-evidence/runtime/orchestration_core_beta_proof.json",
  "release-evidence/runtime/durable_fail_closed_beta_proof.json",
  "release-evidence/runtime/deployment_smoke_beta_proof.json",
];

function readText(relativePath: string): string {
  return fs.readFileSync(path.join(ROOT, relativePath), "utf8");
}

function exists(relativePath: string): boolean {
  return fs.existsSync(path.join(ROOT, relativePath));
}

function parseJson(relativePath: string): unknown {
  return JSON.parse(readText(relativePath));
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value && typeof value === "object" && !Array.isArray(value));
}

function hasFakeProofMarker(value: unknown): boolean {
  if (Array.isArray(value)) return value.some(hasFakeProofMarker);
  if (!isRecord(value)) return false;

  for (const [key, nestedValue] of Object.entries(value)) {
    const normalizedKey = key.toLowerCase();
    if (["fake", "isfake", "fabricated", "syntheticproof", "generatedfakeproof"].includes(normalizedKey) && nestedValue === true) {
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

    if (hasFakeProofMarker(nestedValue)) return true;
  }

  return false;
}

function runChecks(): LintCheck[] {
  const checks: LintCheck[] = [];

  for (const relativePath of REQUIRED_JSON) {
    checks.push({
      name: `json:${relativePath}`,
      passed: exists(relativePath),
      detail: exists(relativePath) ? "File exists." : "Required JSON file is missing.",
    });

    if (exists(relativePath)) {
      try {
        parseJson(relativePath);
        checks.push({ name: `json-parse:${relativePath}`, passed: true, detail: "JSON parses successfully." });
      } catch (error) {
        checks.push({
          name: `json-parse:${relativePath}`,
          passed: false,
          detail: error instanceof Error ? error.message : String(error),
        });
      }
    }
  }

  const packageJson = parseJson("package.json");
  const scripts = isRecord(packageJson) && isRecord(packageJson.scripts) ? packageJson.scripts : {};
  for (const scriptName of REQUIRED_SCRIPTS) {
    const script = scripts[scriptName];
    checks.push({
      name: `script:${scriptName}`,
      passed: typeof script === "string" && script.trim().length > 0,
      detail: typeof script === "string" ? script : "Required package script is missing.",
    });
  }

  for (const relativePath of REQUIRED_DOCS) {
    const present = exists(relativePath);
    const content = present ? readText(relativePath) : "";
    checks.push({
      name: `doc:${relativePath}`,
      passed: present && content.trim().length > 0,
      detail: present ? `${content.trim().length} non-whitespace characters.` : "Required beta document is missing.",
    });
    checks.push({
      name: `doc-heading:${relativePath}`,
      passed: present && /^#\s+.+/m.test(content),
      detail: present ? "Markdown H1 heading check." : "Required beta document is missing.",
    });
    checks.push({
      name: `doc-no-placeholders:${relativePath}`,
      passed: present && !/\b(TBD|TODO|FIXME)\b/i.test(content),
      detail: present ? "No unresolved placeholder tokens found." : "Required beta document is missing.",
    });
  }

  for (const relativePath of REQUIRED_JSON.filter((item) => item.startsWith("release-evidence/runtime/"))) {
    if (!exists(relativePath)) continue;
    let parsed: unknown;
    try {
      parsed = parseJson(relativePath);
    } catch {
      continue;
    }
    checks.push({
      name: `proof-not-fake:${relativePath}`,
      passed: !hasFakeProofMarker(parsed),
      detail: "Proof artifact contains no explicit fake/fabricated-proof marker.",
    });
  }

  return checks;
}

const checks = runChecks();
const failed = checks.filter((check) => !check.passed);

console.log("\nBotomatic repository lint\n");
for (const check of checks) {
  console.log(`${check.passed ? "PASS" : "FAIL"} — ${check.name}`);
  console.log(`  ${check.detail}`);
}

console.log("\nSummary:");
console.log(`  Passed: ${checks.length - failed.length}`);
console.log(`  Failed: ${failed.length}`);

if (failed.length > 0) {
  process.exit(1);
}
