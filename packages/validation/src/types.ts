export type ValidationStatus = "pending" | "running" | "passed" | "failed";

export type ValidationCheckResult = {
  command: string;
  status: "passed" | "failed";
  stdout?: string;
  stderr?: string;
  startedAt: string;
  finishedAt: string;
};

export interface ValidationRecord {
  projectId: string;
  packetId: string;
  status: ValidationStatus;
  checks: string[];
  checkResults?: ValidationCheckResult[];
  summary?: string;
  createdAt: string;
  updatedAt: string;
}
