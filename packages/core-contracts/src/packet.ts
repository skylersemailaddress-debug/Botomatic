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
  dependencies: string[];   // packetIds that must be "complete" before this executes (N82)
  // N82 — Resource declarations for conflict detection and parallel scheduling
  reads:  string[];         // artifact categories this packet consumes
  writes: string[];         // artifact categories this packet produces
  blocks: string[];         // packetIds that cannot start until this one completes
  retryCount: number;
  maxRetries: number;
  riskLevel: RiskLevel;
  status: PacketStatus;
  createdAt: string;
  updatedAt: string;
}
