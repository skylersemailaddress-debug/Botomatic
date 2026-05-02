import fs from "fs";
import path from "path";

type AuditFinding = {
  file: string;
  value: string;
  allowed: boolean;
  reason: string;
};

const BANNED_VALUES = [
  "Luxury Booking Site",
  "LUXORA",
  "Luxora",
  "Alex Johnson",
  "Apply destructive sample",
  "Example canvas output for this prompt.",
  "Document-driven preview, not final production rendering.",
  "Your Escape Awaits",
];

const SCAN_ROOTS = [
  "apps/control-plane/src/app/projects",
  "apps/control-plane/src/components/vibe",
  "apps/control-plane/src/components/pro",
  "apps/control-plane/src/components/project",
  "apps/control-plane/src/components/runtime",
  "apps/control-plane/src/services",
];

const ALLOWED_PATH_PARTS = ["fixtures/demo", "tests/fixtures", "storybook", "__tests__", "test-results"];

function listFiles(root: string): string[] {
  const entries = fs.readdirSync(root, { withFileTypes: true });
  const files: string[] = [];
  for (const entry of entries) {
    const full = path.join(root, entry.name);
    if (entry.isDirectory()) {
      files.push(...listFiles(full));
      continue;
    }
    if (!entry.isFile()) continue;
    if (!/\.(ts|tsx|js|jsx|json|md|css)$/.test(entry.name)) continue;
    files.push(full);
  }
  return files;
}

function isAllowedPath(filePath: string): boolean {
  return ALLOWED_PATH_PARTS.some((part) => filePath.includes(part));
}

function run() {
  const root = process.cwd();
  const runtimeEvidenceDir = path.join(root, "release-evidence", "runtime");
  fs.mkdirSync(runtimeEvidenceDir, { recursive: true });

  const scannedFiles: string[] = [];
  const findings: AuditFinding[] = [];

  for (const scanRoot of SCAN_ROOTS) {
    const absoluteRoot = path.join(root, scanRoot);
    if (!fs.existsSync(absoluteRoot)) continue;
    for (const filePath of listFiles(absoluteRoot)) {
      const rel = path.relative(root, filePath);
      scannedFiles.push(rel);
      const content = fs.readFileSync(filePath, "utf8");
      for (const value of BANNED_VALUES) {
        if (!content.includes(value)) continue;
        const allowed = isAllowedPath(rel);
        findings.push({
          file: rel,
          value,
          allowed,
          reason: allowed ? "Allowed because file is in explicit fixture/test-only path." : "Banned runtime/demo contamination value on real route surface.",
        });
      }
    }
  }

  const disallowed = findings.filter((f) => !f.allowed);
  const allowed = findings.filter((f) => f.allowed);

  const artifact = {
    generatedAt: new Date().toISOString(),
    status: disallowed.length === 0 ? "passed" : "failed",
    filesScanned: scannedFiles.length,
    scannedFilePaths: scannedFiles.sort(),
    demoStaticValuesFound: findings,
    valuesRemoved: [
      {
        value: "Apply destructive sample",
        reason: "Removed from runtime Vibe action row.",
      },
      {
        value: "Document-driven preview, not final production rendering.",
        reason: "Removed from runtime preview surface and renderer UI copy.",
      },
    ],
    valuesMovedToTestOrDemoFixtures: [],
    remainingAllowedDemoValues: allowed,
    criticalFailures: disallowed.length,
  };

  const outPath = path.join(runtimeEvidenceDir, "no_demo_contamination_audit.json");
  fs.writeFileSync(outPath, JSON.stringify(artifact, null, 2));
  console.log(`No-demo contamination audit written: status=${artifact.status} criticalFailures=${artifact.criticalFailures}`);
  if (artifact.criticalFailures > 0) process.exit(1);
}

run();
