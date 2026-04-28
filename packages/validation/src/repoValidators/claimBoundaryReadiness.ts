import fs from "fs";
import path from "path";
import type { RepoValidatorResult } from "../repoValidators";

type Occurrence = {
  phrase: string;
  line: number;
  section: string;
};

const REQUIRED_DOCS = [
  "README.md",
  "LEGAL_CLAIM_BOUNDARIES.md",
  "EVIDENCE_BOUNDARY_POLICY.md",
  "MARKETING_CLAIMS_ALLOWED.md",
] as const;

const OPTIONAL_DOCS = [
  "PRODUCT_SCOPE.md",
  "UNIVERSAL_BUILDER_TARGET.md",
  "CHAT_FIRST_PRODUCT_SPEC.md",
] as const;

const PROHIBITED_PHRASES = [
  "builds 99% of all software",
  "fully replaces developers",
  "guaranteed enterprise-ready app from any messy prompt",
  "all integrations are production-proven",
  "one-click live deployment is proven across providers",
  "every blueprint permutation is exhaustively validated",
  "no human review required for commercial launch",
  "universal 10/10 production readiness for every app type",
  "guaranteed launch-ready",
  "exhaustive universal production proof",
  "live deployment proven across all providers",
] as const;

const REQUIRED_CAVEAT_PATTERNS: Array<{ label: string; pattern: RegExp }> = [
  {
    label: "representative proof is not exhaustive proof",
    pattern: /representative\s+(evidence|proof)\s+is\s+not\s+exhaustive(?:-domain)?\s+(evidence|proof)/i,
  },
  {
    label: "live deployment requires explicit approval",
    pattern: /live\s+deployment\s+requires\s+explicit\s+approval/i,
  },
  {
    label: "real credentials are required for live deployment",
    pattern: /real\s+credentials\s+(are\s+)?required\s+for\s+live\s+deployment/i,
  },
  {
    label: "failed critical validators block launch-ready claims",
    pattern: /failed\s+critical\s+validators?\s+blocks?\s+launch-ready\s+claims?/i,
  },
  {
    label: "current code and validator output beat old docs",
    pattern: /(current\s+code\s*\+?\s*current\s+validator\s+output\s+supersede\s+stale\s+docs)|(current\s+code\s+and\s+validator\s+output\s+(beat|supersede)\s+(old|stale)\s+docs)/i,
  },
  {
    label: "no placeholder/fake integration path may support a commercial claim",
    pattern: /no\s+placeholder\s*\/?\s*fake\s+integration\s+path\s+may\s+support\s+a\s+commercial\s+claim/i,
  },
];

function has(root: string, rel: string): boolean {
  return fs.existsSync(path.join(root, rel));
}

function read(root: string, rel: string): string {
  return fs.readFileSync(path.join(root, rel), "utf8");
}

function listMarkdownRecursive(root: string, relDir: string): string[] {
  const base = path.join(root, relDir);
  if (!fs.existsSync(base)) return [];

  const out: string[] = [];
  const stack: string[] = [base];
  while (stack.length > 0) {
    const current = stack.pop()!;
    for (const entry of fs.readdirSync(current)) {
      const full = path.join(current, entry);
      const stat = fs.statSync(full);
      if (stat.isDirectory()) {
        stack.push(full);
      } else if (/\.md$/i.test(entry)) {
        out.push(path.relative(root, full));
      }
    }
  }

  return out;
}

function collectClaimScanFiles(root: string): string[] {
  const files = new Set<string>(REQUIRED_DOCS);

  for (const rel of OPTIONAL_DOCS) {
    if (has(root, rel)) files.add(rel);
  }

  for (const rel of listMarkdownRecursive(root, "docs")) {
    if (/marketing|readiness/i.test(rel)) {
      files.add(rel);
    }
  }

  const rootMarkdown = fs.readdirSync(root)
    .filter((name) => /\.md$/i.test(name))
    .filter((name) => /marketing|readiness/i.test(name));

  for (const rel of rootMarkdown) {
    files.add(rel);
  }

  return Array.from(files).sort();
}

function findProhibitedSections(content: string): Array<{ start: number; end: number; title: string }> {
  const lines = content.split(/\r?\n/);
  const headings: Array<{ line: number; level: number; title: string }> = [];

  lines.forEach((line, index) => {
    const match = line.match(/^(#{1,6})\s+(.+)$/);
    if (!match) return;
    headings.push({ line: index + 1, level: match[1].length, title: match[2].trim().toLowerCase() });
  });

  const sections: Array<{ start: number; end: number; title: string }> = [];
  for (let i = 0; i < headings.length; i += 1) {
    const heading = headings[i];
    if (!heading.title.includes("prohibited")) continue;

    let endLine = lines.length;
    for (let j = i + 1; j < headings.length; j += 1) {
      if (headings[j].level <= heading.level) {
        endLine = headings[j].line - 1;
        break;
      }
    }

    sections.push({ start: heading.line, end: endLine, title: heading.title });
  }

  return sections;
}

function sectionForLine(line: number, sections: Array<{ start: number; end: number; title: string }>): string {
  const match = sections.find((section) => line >= section.start && line <= section.end);
  return match ? match.title : "outside prohibited sections";
}

function findPhraseOccurrences(content: string, phrase: string, sections: Array<{ start: number; end: number; title: string }>): Occurrence[] {
  const needle = phrase.toLowerCase();
  const lines = content.split(/\r?\n/);
  const occurrences: Occurrence[] = [];
  for (let i = 0; i < lines.length; i += 1) {
    const lowerLine = lines[i].toLowerCase();
    let from = 0;
    while (from < lowerLine.length) {
      const index = lowerLine.indexOf(needle, from);
      if (index === -1) break;
      from = index + needle.length;
      const lineNumber = i + 1;
      occurrences.push({
        phrase,
        line: lineNumber,
        section: sectionForLine(lineNumber, sections),
      });
    }
  }

  return occurrences;
}

function result(ok: boolean, summary: string, checks: string[]): RepoValidatorResult {
  return {
    name: "Validate-Botomatic-ClaimBoundaryReadiness",
    status: ok ? "passed" : "failed",
    summary,
    checks,
  };
}

export function validateClaimBoundaryReadiness(root: string): RepoValidatorResult {
  const checks = collectClaimScanFiles(root);

  const missingRequired = REQUIRED_DOCS.filter((rel) => !has(root, rel));
  if (missingRequired.length > 0) {
    return result(false, `Claim-boundary docs missing: ${missingRequired.join(", ")}`, checks);
  }

  const readme = read(root, "README.md").toLowerCase();
  const hasClaimBoundaryLinks =
    readme.includes("claim boundaries") &&
    readme.includes("legal_claim_boundaries.md") &&
    readme.includes("evidence_boundary_policy.md") &&
    readme.includes("marketing_claims_allowed.md");

  if (!hasClaimBoundaryLinks) {
    return result(false, "README.md must include a claim-boundary section with links to legal/evidence/marketing policy docs.", checks);
  }

  const legalText = read(root, "LEGAL_CLAIM_BOUNDARIES.md");
  const evidenceText = read(root, "EVIDENCE_BOUNDARY_POLICY.md");
  const marketingText = read(root, "MARKETING_CLAIMS_ALLOWED.md");
  const claimBoundaryCorpus = `${legalText}\n${evidenceText}\n${marketingText}`;

  const missingCaveats = REQUIRED_CAVEAT_PATTERNS
    .filter((entry) => !entry.pattern.test(claimBoundaryCorpus))
    .map((entry) => entry.label);

  if (missingCaveats.length > 0) {
    return result(false, `Claim-boundary caveats missing required language: ${missingCaveats.join("; ")}`, checks);
  }

  const allowedProhibitedExamples = new Set([
    "LEGAL_CLAIM_BOUNDARIES.md",
    "MARKETING_CLAIMS_ALLOWED.md",
  ]);

  const violations: string[] = [];

  for (const rel of checks) {
    if (!has(root, rel)) continue;
    const content = read(root, rel);
    const prohibitedSections = findProhibitedSections(content);

    for (const phrase of PROHIBITED_PHRASES) {
      const occurrences = findPhraseOccurrences(content, phrase, prohibitedSections);
      for (const occurrence of occurrences) {
        const inAllowedFile = allowedProhibitedExamples.has(rel);
        const inProhibitedSection = occurrence.section !== "outside prohibited sections";
        const allowed = inAllowedFile && inProhibitedSection;
        if (!allowed) {
          violations.push(`${rel}:${occurrence.line} contains prohibited claim \"${occurrence.phrase}\" (${occurrence.section})`);
        }
      }
    }
  }

  if (violations.length > 0) {
    return result(false, `Unsupported public claim language detected: ${violations.join("; ")}`, checks);
  }

  return result(
    true,
    "Claim-boundary guard is enforced: required legal/evidence/marketing docs exist, README links are present, required caveats exist, and prohibited public claims are blocked outside explicit prohibited-example sections.",
    checks
  );
}
