export type ValidationStatus = "pending" | "running" | "passed" | "failed";

export interface ValidationRecord {
  projectId: string;
  packetId: string;
  status: ValidationStatus;
  checks: string[];
  summary?: string;
  createdAt: string;
  updatedAt: string;
}
