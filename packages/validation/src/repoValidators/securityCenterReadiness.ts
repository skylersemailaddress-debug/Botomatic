import fs from "fs";
import path from "path";
import type { RepoValidatorResult } from "../repoValidators";

function has(root: string, rel: string): boolean {
  return fs.existsSync(path.join(root, rel));
}

function read(root: string, rel: string): string {
  return fs.readFileSync(path.join(root, rel), "utf8");
}

function result(ok: boolean, summary: string, checks: string[]): RepoValidatorResult {
  return {
    name: "Validate-Botomatic-SecurityCenterReadiness",
    status: ok ? "passed" : "failed",
    summary,
    checks,
  };
}

export function validateSecurityCenterReadiness(root: string): RepoValidatorResult {
  const checks = [
    "apps/orchestrator-api/src/server_app.ts",
    "apps/control-plane/src/components/overview/SecurityCenterPanel.tsx",
    "apps/control-plane/src/services/securityCenter.ts",
  ];

  if (!checks.every((rel) => has(root, rel))) {
    return result(false, "Security Center files are incomplete.", checks);
  }

  const server = read(root, "apps/orchestrator-api/src/server_app.ts");
  const panel = read(root, "apps/control-plane/src/components/overview/SecurityCenterPanel.tsx").toLowerCase();

  const ok =
    server.includes("/ui/security-center") &&
    server.includes("/security-center/dependency-scan") &&
    panel.includes("threat model") &&
    panel.includes("rbac matrix") &&
    panel.includes("data privacy") &&
    panel.includes("dependency risk") &&
    panel.includes("supply chain") &&
    panel.includes("audit log");

  return result(
    ok,
    ok
      ? "Security Center includes threat model, RBAC matrix, data privacy, dependency risk, supply-chain checks, and audit log surface."
      : "Security Center is missing required runtime/API/UI coverage.",
    checks
  );
}
