export type MissionClaimLevel =
  | "MISSION_COMPILED"
  | "WAVE_READY"
  | "WAVE_PROVEN"
  | "SYSTEM_PARTIAL"
  | "SYSTEM_BUILDABLE"
  | "SYSTEM_RUNTIME_PROVEN"
  | "SYSTEM_LAUNCH_READY";

export type WaveStatus =
  | "pending"
  | "ready"
  | "running"
  | "proven"
  | "failed"
  | "skipped";

export type MissionStatus =
  | "compiled"
  | "in_progress"
  | "partial"
  | "proven"
  | "failed";

export interface MissionEvidence {
  evidenceId: string;
  waveId: string;
  evidenceType: "build" | "test" | "smoke" | "validator" | "checkpoint";
  passed: boolean;
  detail: string;
  capturedAt: string;
}

export interface MissionCheckpoint {
  checkpointId: string;
  missionId: string;
  waveId: string;
  waveIndex: number;
  status: WaveStatus;
  evidence: MissionEvidence[];
  savedAt: string;
}

export interface MissionPacket {
  packetId: string;
  waveId: string;
  goal: string;
  scope: string[];
  acceptanceCriteria: string[];
  riskLevel: "low" | "medium" | "high";
}

export interface MissionWave {
  waveId: string;
  missionId: string;
  index: number;
  name: string;
  description: string;
  dependsOn: string[];
  packets: MissionPacket[];
  requiredValidators: string[];
  evidenceRequirements: string[];
  acceptanceCriteria: string[];
  status: WaveStatus;
  provenAt?: string;
  failedAt?: string;
  evidence: MissionEvidence[];
}

export interface Mission {
  missionId: string;
  projectId: string;
  sourceFile: string;
  sourceHash: string;
  specHash: string;
  title: string;
  description: string;
  waves: MissionWave[];
  status: MissionStatus;
  claimLevel: MissionClaimLevel;
  compiledAt: string;
  lastUpdatedAt: string;
  checkpoints: MissionCheckpoint[];
  totalWaves: number;
  provenWaves: number;
}
