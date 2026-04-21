import { ValidationRecord } from "./types";

export function runValidation(projectId: string, packetId: string): ValidationRecord {
  const now = new Date().toISOString();

  // MVP: always pass
  return {
    projectId,
    packetId,
    status: "passed",
    checks: ["build", "lint", "typecheck"],
    summary: "All checks passed (mock)",
    createdAt: now,
    updatedAt: now
  };
}
