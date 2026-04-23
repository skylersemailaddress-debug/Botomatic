import { exec } from "child_process";
import { promisify } from "util";
import { ValidationRecord, ValidationCheckResult } from "./types";

const execAsync = promisify(exec);

async function runCommand(command: string): Promise<ValidationCheckResult> {
  const start = new Date().toISOString();
  try {
    const { stdout, stderr } = await execAsync(command, { timeout: 120000 });
    return {
      command,
      status: "passed",
      stdout,
      stderr,
      startedAt: start,
      finishedAt: new Date().toISOString(),
    };
  } catch (error: any) {
    return {
      command,
      status: "failed",
      stdout: error?.stdout || "",
      stderr: error?.stderr || String(error?.message || error),
      startedAt: start,
      finishedAt: new Date().toISOString(),
    };
  }
}

export async function runValidation(projectId: string, packetId: string): Promise<ValidationRecord> {
  const now = new Date().toISOString();

  const checks = [
    "npm install",
    "npm run lint",
    "npm run typecheck",
    "npm run build"
  ];

  const results: ValidationCheckResult[] = [];

  for (const cmd of checks) {
    const result = await runCommand(cmd);
    results.push(result);
    if (result.status === "failed") break;
  }

  const overallStatus = results.every(r => r.status === "passed") ? "passed" : "failed";

  return {
    projectId,
    packetId,
    status: overallStatus,
    checks,
    checkResults: results,
    summary: overallStatus === "passed" ? "All checks passed" : "Validation failed",
    createdAt: now,
    updatedAt: new Date().toISOString()
  };
}
