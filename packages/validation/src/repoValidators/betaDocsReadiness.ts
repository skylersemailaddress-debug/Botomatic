import fs from "node:fs";
import path from "node:path";
import type { RepoValidatorResult } from "../repoValidators";

const REQUIRED_BETA_DOCS: Record<string, string[]> = {
  "docs/beta/BETA_ONBOARDING.md": [
    "Who the beta is for",
    "Current supported product surfaces",
    "Unsupported surfaces",
    "Feedback expectations",
    "Beta gate reminder",
  ],
  "docs/beta/BETA_TERMS.md": [
    "Invitation-only access",
    "Beta nature and no public-launch SLA",
    "Data users should enter",
    "Data users should not enter",
    "Security posture and beta caveats",
    "Rollback and data-change expectations",
    "Feedback and bug reports",
    "Beta gate reminder",
  ],
  "docs/beta/BETA_PRIVACY.md": [
    "Beta data categories",
    "What users should enter",
    "What users should not enter",
    "How beta data is used",
    "Access boundaries",
    "Security posture and beta caveats",
    "Questions or requests",
  ],
  "docs/beta/KNOWN_LIMITATIONS.md": [
    "Current supported product surfaces",
    "Unsupported surfaces",
    "Known limitations",
    "Security posture and beta caveats",
    "Rollback expectations",
    "Beta gate reminder",
  ],
  "docs/beta/SUPPORT.md": [
    "Support model",
    "How users report bugs",
    "How beta users should submit feedback",
    "Security issues",
    "Data deletion or export requests",
    "Incident handling",
    "Beta gate reminder",
  ],
  "docs/beta/DATA_DELETION_EXPORT.md": [
    "Request types",
    "How to submit a request",
    "Verification",
    "Deletion handling",
    "Export handling",
    "Accidental sensitive-data handling",
    "Expected timing",
    "Beta gate reminder",
  ],
  "docs/beta/INCIDENT_CHECKLIST.md": [
    "Incident triggers",
    "First response",
    "Containment",
    "Investigation",
    "User communication",
    "Rollback expectations",
    "Recovery",
    "Post-incident review",
    "Beta gate reminder",
  ],
};

const REQUIRED_REFERENCES = [
  "docs/beta/FRIENDS_AND_FAMILY_BETA_GATE.md",
  "fail-closed beta gate",
] as const;

const REQUIRED_CHANGELOG_SIGNALS = [
  "friends-and-family beta documentation pack",
  "fail-closed beta gate",
] as const;

const PROHIBITED_PUBLIC_READINESS_CLAIMS = [
  /public\s+launch\s+ready/i,
  /public\s+production\s+readiness/i,
  /ready\s+for\s+public\s+production/i,
  /production-ready\s+for\s+public\s+launch/i,
  /guaranteed\s+(uptime|resolution|response|availability)/i,
  /99\.9\s*%\s+uptime/i,
] as const;

function has(root: string, rel: string): boolean {
  return fs.existsSync(path.join(root, rel));
}

function read(root: string, rel: string): string {
  return fs.readFileSync(path.join(root, rel), "utf8");
}

function markdownHeadings(content: string): Set<string> {
  const headings = new Set<string>();
  for (const line of content.split(/\r?\n/)) {
    const match = line.match(/^#{1,6}\s+(.+)$/);
    if (match) headings.add(match[1].trim());
  }
  return headings;
}

function result(ok: boolean, summary: string, checks: string[]): RepoValidatorResult {
  return {
    name: "Validate-Botomatic-BetaDocsReadiness",
    status: ok ? "passed" : "failed",
    summary,
    checks,
  };
}

export function validateBetaDocsReadiness(root: string): RepoValidatorResult {
  const checks = [...Object.keys(REQUIRED_BETA_DOCS), "CHANGELOG.md"];
  const missingFiles = checks.filter((rel) => !has(root, rel));
  if (missingFiles.length > 0) {
    return result(false, `Beta documentation pack is missing files: ${missingFiles.join(", ")}.`, checks);
  }

  const failures: string[] = [];
  for (const [rel, requiredHeadings] of Object.entries(REQUIRED_BETA_DOCS)) {
    const content = read(root, rel);
    const lower = content.toLowerCase();
    const headings = markdownHeadings(content);
    const missingHeadings = requiredHeadings.filter((heading) => !headings.has(heading));
    if (missingHeadings.length > 0) {
      failures.push(`${rel} missing headings: ${missingHeadings.join(", ")}`);
    }

    for (const reference of REQUIRED_REFERENCES) {
      if (!lower.includes(reference.toLowerCase())) {
        failures.push(`${rel} does not reference ${reference}`);
      }
    }

    for (const pattern of PROHIBITED_PUBLIC_READINESS_CLAIMS) {
      if (pattern.test(content)) {
        failures.push(`${rel} contains a prohibited public readiness claim matching ${pattern.source}`);
      }
    }
  }

  const changelog = read(root, "CHANGELOG.md").toLowerCase();
  for (const signal of REQUIRED_CHANGELOG_SIGNALS) {
    if (!changelog.includes(signal)) failures.push(`CHANGELOG.md missing beta docs signal: ${signal}`);
  }

  if (failures.length > 0) {
    return result(false, `Beta docs readiness failed: ${failures.join("; ")}.`, checks);
  }

  return result(
    true,
    "Required friends-and-family beta docs exist, include required headings, avoid public-launch readiness claims, and reference the fail-closed beta gate.",
    checks
  );
}
