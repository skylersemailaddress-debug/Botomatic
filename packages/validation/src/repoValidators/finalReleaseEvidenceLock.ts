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

function includesAll(content: string, required: string[]) {
  return required.filter((item) => content.includes(item));
}

export function validateFinalReleaseEvidenceLock(root: string): RepoValidatorResult {
  const checks: string[] = [];
  const issues: string[] = [];

  const rel = "docs/final-release-evidence-lock.md";
  const abs = path.join(root, rel);
  if (!fs.existsSync(abs)) {
    return result(
      "Validate-Botomatic-FinalReleaseEvidenceLock",
      false,
      "Final release evidence lock document is missing.",
      checks
    );
  }
  checks.push(`${rel} exists`);

  const content = read(root, rel).toLowerCase();

  const requiredPhrases = [
    "release-candidate ready",
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
    "no known p0/p1/p2 release-candidate blockers"
  ];

  const foundRequired = includesAll(content, requiredPhrases);
  for (const phrase of foundRequired) checks.push(`contains: ${phrase}`);
  if (foundRequired.length !== requiredPhrases.length) {
    const missing = requiredPhrases.filter((p) => !foundRequired.includes(p));
    issues.push(`missing required release-lock phrases: ${missing.join(", ")}`);
  }

  if (!(content.includes("not") && content.includes("live deployment claim"))) {
    issues.push("missing bounded wording for live deployment claim");
  } else {
    checks.push("contains bounded wording for live deployment claim");
  }

  if (!(content.includes("not") && content.includes("production-ready claim"))) {
    issues.push("missing bounded wording for production-ready claim");
  } else {
    checks.push("contains bounded wording for production-ready claim");
  }

  const forbiddenOverclaims = [
    "live deployed",
    "guaranteed enterprise app output"
  ];
  for (const forbidden of forbiddenOverclaims) {
    if (content.includes(forbidden)) {
      issues.push(`forbidden overclaim present: ${forbidden}`);
    } else {
      checks.push(`forbidden overclaim absent: ${forbidden}`);
    }
  }

  if (content.includes("zero leaks proven") && !content.includes("not") ) {
    issues.push("forbidden overclaim present: zero leaks proven");
  } else {
    checks.push("forbidden overclaim absent (or explicitly negated): zero leaks proven");
  }

  if (issues.length > 0) {
    return result(
      "Validate-Botomatic-FinalReleaseEvidenceLock",
      false,
      `Final release evidence lock validation failed: ${issues.join("; ")}`,
      checks
    );
  }

  return result(
    "Validate-Botomatic-FinalReleaseEvidenceLock",
    true,
    "Final release evidence lock document is present and claim-bounded.",
    checks
  );
}
