import fs from "fs";
import path from "path";
import { validateNoPlaceholders } from "./validateNoPlaceholders";

type RuleResult = { ok: boolean; issues: string[] };

const REQUIRED_FILES = [
  "package.json",
  "app/page.tsx",
  "app/dashboard/page.tsx",
  "app/settings/page.tsx",
  "components/AppShell.tsx",
  "components/StatusCard.tsx",
  "app/api/health/route.ts",
  "app/api/workflows/execute/route.ts",
  "db/schema.sql",
  "db/migrations/001_init.sql",
  "auth/rbacPolicy.ts",
  "lib/formValidation.ts",
  "workflows/onboarding.ts",
  "workflows/approvalFlow.ts",
  "tests/workflow.test.ts",
  "deploy/vercel.json",
  ".env.example",
  "README.md",
  "RUNBOOK.md",
  "launch/launch_packet.json",
];

function readSafe(filePath: string): string {
  try {
    return fs.readFileSync(filePath, "utf8");
  } catch {
    return "";
  }
}

export function validateEmittedOutput(appRoot: string): RuleResult {
  const issues: string[] = [];

  if (!appRoot || !fs.existsSync(appRoot)) {
    return { ok: false, issues: ["Emitted app output directory is missing."] };
  }

  for (const rel of REQUIRED_FILES) {
    const full = path.join(appRoot, rel);
    if (!fs.existsSync(full)) {
      issues.push(`Required emitted file missing: ${rel}`);
      continue;
    }

    const stat = fs.statSync(full);
    if (!stat.isFile()) {
      issues.push(`Required emitted path is not a file: ${rel}`);
      continue;
    }

    const content = readSafe(full).trim();
    if (!content) {
      issues.push(`Required emitted file is empty: ${rel}`);
      continue;
    }

    const placeholderScan = validateNoPlaceholders(content);
    if (!placeholderScan.ok) {
      issues.push(`Placeholder token detected in emitted file: ${rel}`);
    }
  }

  const launchPacketPath = path.join(appRoot, "launch/launch_packet.json");
  if (fs.existsSync(launchPacketPath)) {
    try {
      const launchPacket = JSON.parse(readSafe(launchPacketPath));
      if (!Array.isArray(launchPacket?.validators) || launchPacket.validators.length < 3) {
        issues.push("Launch packet validators array is missing or too shallow.");
      }
    } catch {
      issues.push("Launch packet is not valid JSON.");
    }
  }

  return { ok: issues.length === 0, issues };
}
