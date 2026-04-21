export type PacketStatus =
  | "pending"
  | "queued"
  | "executing"
  | "validating"
  | "failed"
  | "repaired"
  | "complete"
  | "blocked";

export type RiskLevel = "low" | "medium" | "high";

export interface Packet {
  packetId: string;
  projectId: string;
  milestoneId: string;
  goal: string;
  branchName: string;
  filesToTouch: string[];
  requirements: string[];
  acceptanceCriteria: string[];
  validationCommands: string[];
  constraints: string[];
  executorTarget: "claude";
  dependencies: string[];
  retryCount: number;
  maxRetries: number;
  riskLevel: RiskLevel;
  status: PacketStatus;
  createdAt: string;
  updatedAt: string;
}
