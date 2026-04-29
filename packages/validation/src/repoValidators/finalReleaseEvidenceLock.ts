import fs from "fs";
import path from "path";

export type RepoValidatorResult = {
  name: string;
  status: "passed" | "failed";
  summary: string;
  checks: string[];
};

function result(name: string, ok: boolean, summary: string, checks: string[]): RepoValidatorResult {
  return { name, status: ok ? "passed" : "failed", summary, checks };
}

function read(root: string, rel: string): string {
  return fs.readFileSync(path.join(root, rel), "utf8");
}

function findIncludedPhrases(content: string, required: string[]) {
  return required.filter((item) => content.includes(item));
}

export function validateFinalReleaseEvidenceLock(root: string): RepoValidatorResult {
  const checks: string[] = [];
  const issues: string[] = [];

  const rel = "docs/final-release-evidence-lock.md";
  const abs = path.join(root, rel);
  if (!fs.existsSync(abs)) {
    return result("Validate-Botomatic-FinalReleaseEvidenceLock", false, "Final release evidence lock document is missing.", checks);
  }
  checks.push(`${rel} exists`);

  const content = read(root, rel).toLowerCase();

  const requiredPhrases = [
    "release-candidate ready",
    "release-candidate foundation evidence only",
    "does not mark the max-power autonomous builder product complete",
    "npm run -s build",
    "npm run -s test:universal",
    "npm run -s validate:all",
    "npm run -s doctor",
    "legal/claim boundary",
    "evidence boundary",
    "ui route proof",
    "generated app corpus",
    "dirty repo evidence",
    "dirty repo completion v2",
    "dirty repo repair-loop proof",
    "self-upgrade safety",
    "secret leak prevention",
    "deployment dry-run",
    "credentialed deployment readiness",
    "live deployment execution boundary",
    "route-level deploy gates",
    "proof-engine claim verification",
    "no known p0/p1/p2 release-candidate blockers",
    "not a live deployment claim",
    "not a production-ready claim",
    "not a zero leaks proven claim",
    "not a claim that all generated apps are production-ready without validation"
  ];

  const foundRequired = findIncludedPhrases(content, requiredPhrases);
  for (const phrase of foundRequired) checks.push(`contains: ${phrase}`);
  if (foundRequired.length !== requiredPhrases.length) {
    const missing = requiredPhrases.filter((p) => !foundRequired.includes(p));
    issues.push(`missing required release-lock phrases: ${missing.join(", ")}`);
  }

  const lines = content.split(/\r?\n/).map((line) => line.trim());

  const forbiddenLineClaims: Array<{ claim: string; allowedNegation: string }> = [
    { claim: "this is a live deployment claim", allowedNegation: "not a live deployment claim" },
    { claim: "zero leaks proven", allowedNegation: "not a zero leaks proven claim" },
    { claim: "all generated apps are production-ready without validation", allowedNegation: "not a claim that all generated apps are production-ready without validation" },
    { claim: "guaranteed enterprise app output", allowedNegation: "" }
  ];

  for (const rule of forbiddenLineClaims) {
    const violatingLine = lines.find((line) => line.includes(rule.claim) && (rule.allowedNegation === "" || !line.includes(rule.allowedNegation)));
    if (violatingLine) {
      issues.push(`forbidden positive claim present: ${rule.claim}`);
    } else {
      checks.push(`forbidden positive claim absent or explicitly bounded: ${rule.claim}`);
    }
  }

  const violatingProductionReadyLine = lines.find(
    (line) => line.includes("production-ready") && !line.includes("not a production-ready claim") && !line.includes("not a claim that all generated apps are production-ready without validation")
  );
  if (violatingProductionReadyLine) {
    issues.push("forbidden positive claim present: production-ready");
  } else {
    checks.push("forbidden positive claim absent or explicitly bounded: production-ready");
  }

  if (issues.length > 0) {
    return result(
      "Validate-Botomatic-FinalReleaseEvidenceLock",
      false,
      `Final release evidence lock validation failed: ${issues.join("; ")}`,
      checks
    );
  }

  return result("Validate-Botomatic-FinalReleaseEvidenceLock", true, "Final release evidence lock document is present and claim-bounded.", checks);
}
