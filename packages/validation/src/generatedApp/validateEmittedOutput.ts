import fs from "fs";
import path from "path";
import { validateNoPlaceholders } from "./validateNoPlaceholders";
import { REQUIRED_LAUNCH_PACKAGE_FILES, containsSecretLikeValue } from "./launchPackage";

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

  for (const rel of REQUIRED_LAUNCH_PACKAGE_FILES) {
    const full = path.join(appRoot, rel);
    if (!fs.existsSync(full)) {
      issues.push(`Required launch package file missing: ${rel}`);
      continue;
    }
    const stat = fs.statSync(full);
    if (!stat.isFile()) {
      issues.push(`Required launch package path is not a file: ${rel}`);
      continue;
    }
    if (stat.size === 0) {
      issues.push(`Required launch package file is empty: ${rel}`);
    }
  }

  const launchPacketPath = path.join(appRoot, "launch/launch_packet.json");
  if (fs.existsSync(launchPacketPath)) {
    try {
      const launchPacket = JSON.parse(readSafe(launchPacketPath));
      if (!Array.isArray(launchPacket?.validators) || launchPacket.validators.length < 3) {
        issues.push("Launch packet validators array is missing or too shallow.");
      }
      if (launchPacket?.localLaunchDefault !== true) {
        issues.push("Launch packet must declare localLaunchDefault=true.");
      }
      if (launchPacket?.cloudDeploymentApprovalRequired !== true) {
        issues.push("Launch packet must declare cloudDeploymentApprovalRequired=true.");
      }
    } catch {
      issues.push("Launch packet is not valid JSON.");
    }
  }

  const secretRequirementsPath = path.join(appRoot, "launch/secret-requirements.json");
  if (fs.existsSync(secretRequirementsPath)) {
    try {
      const secretRequirements = JSON.parse(readSafe(secretRequirementsPath));
      if (!Array.isArray(secretRequirements?.secrets) || secretRequirements.secrets.length < 1) {
        issues.push("secret-requirements.json must declare at least one secret reference.");
      }
      if (secretRequirements?.noPlaintextRepoStorage !== true) {
        issues.push("secret-requirements.json must assert noPlaintextRepoStorage=true.");
      }
      for (const item of secretRequirements?.secrets || []) {
        if (typeof item?.secretUri !== "string" || !item.secretUri.startsWith("secret://")) {
          issues.push("secret-requirements.json contains non-secret:// secret reference.");
        }
      }
    } catch {
      issues.push("secret-requirements.json is not valid JSON.");
    }
  }

  const deploymentTargetsPath = path.join(appRoot, "launch/deployment-targets.json");
  if (fs.existsSync(deploymentTargetsPath)) {
    try {
      const deploymentTargets = JSON.parse(readSafe(deploymentTargetsPath));
      if (!Array.isArray(deploymentTargets?.targets) || deploymentTargets.targets.length < 1) {
        issues.push("deployment-targets.json must declare at least one deployment target.");
      }
    } catch {
      issues.push("deployment-targets.json is not valid JSON.");
    }
  }

  const allFiles = fs.existsSync(appRoot)
    ? fs.readdirSync(appRoot, { recursive: true }).map((entry) => path.join(appRoot, String(entry)))
    : [];
  for (const full of allFiles) {
    if (!fs.existsSync(full) || !fs.statSync(full).isFile()) continue;
    if (/\.(png|ico)$/i.test(full)) continue;
    const content = readSafe(full);
    if (containsSecretLikeValue(content)) {
      issues.push(`Real secret-like value detected in emitted output: ${path.relative(appRoot, full)}`);
      break;
    }
  }

  return { ok: issues.length === 0, issues };
}
