import type { MilestoneDefinition } from "./milestonePlanner";
import type { FailureInspection, RepairAttemptHistory } from "./failurePolicy";

export type RunStatus = "idle" | "running" | "paused_human_blocker" | "failed" | "completed";

export type RunCheckpoint = {
  runId: string;
  currentMilestone: string;
  completedMilestones: string[];
  failedMilestone: string | null;
  repairAttempts: number;
  repairAttemptsBySignature: Record<string, number>;
  repairAttemptsByMilestoneCategory: Record<string, number>;
  repairHistory: RepairAttemptHistory[];
  lastFailure: FailureInspection | null;
  artifactPaths: string[];
  logs: string[];
  resumeCommand: string;
  nextAction: string;
};

export type AutonomousBuildRunState = {
  runId: string;
  status: RunStatus;
  milestoneGraph: MilestoneDefinition[];
  checkpoint: RunCheckpoint;
  humanBlockers: Array<{ code: string; detail: string; requiredAction: string; approved: boolean }>;
  startedAt: string;
  updatedAt: string;
  finalReleaseAssembled: boolean;
};

export function createInitialCheckpoint(runId: string, firstMilestone: string): RunCheckpoint {
  return {
    runId,
    currentMilestone: firstMilestone,
    completedMilestones: [],
    failedMilestone: null,
    repairAttempts: 0,
    repairAttemptsBySignature: {},
    repairAttemptsByMilestoneCategory: {},
    repairHistory: [],
    lastFailure: null,
    artifactPaths: [],
    logs: ["Run initialized."],
    resumeCommand: `npm run -s autonomous-build:resume -- ${runId}`,
    nextAction: `Execute milestone ${firstMilestone}`,
  };
}

export function updateCheckpoint(
  state: AutonomousBuildRunState,
  input: Partial<RunCheckpoint> & { log?: string; nextAction?: string }
): AutonomousBuildRunState {
  const logs = [...state.checkpoint.logs, ...(input.log ? [input.log] : [])];
  const updated: AutonomousBuildRunState = {
    ...state,
    checkpoint: {
      ...state.checkpoint,
      ...input,
      logs,
      completedMilestones: input.completedMilestones || state.checkpoint.completedMilestones,
      artifactPaths: input.artifactPaths || state.checkpoint.artifactPaths,
      nextAction: input.nextAction || state.checkpoint.nextAction,
    },
    updatedAt: new Date().toISOString(),
  };
  return updated;
}
