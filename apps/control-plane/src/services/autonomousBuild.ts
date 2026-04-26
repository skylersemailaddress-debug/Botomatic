import { getJson, postJson } from "./api";

export type AutonomousBuildStatus = "idle" | "running" | "paused_human_blocker" | "failed" | "completed";

export type AutonomousBuildRunResponse = {
  ok: boolean;
  run: {
    runId: string;
    status: AutonomousBuildStatus;
    milestoneGraph: Array<{
      id: string;
      objective: string;
      dependencies: string[];
      blockerPolicy: string;
      validators: string[];
      doneCriteria: string[];
    }>;
    checkpoint: {
      runId: string;
      currentMilestone: string;
      completedMilestones: string[];
      failedMilestone: string | null;
      repairAttempts: number;
      artifactPaths: string[];
      logs: string[];
      resumeCommand: string;
      nextAction: string;
    };
    humanBlockers: Array<{
      code: string;
      detail: string;
      requiredAction: string;
      approved: boolean;
    }>;
    finalReleaseAssembled: boolean;
    startedAt: string;
    updatedAt: string;
  };
};

export async function startAutonomousBuild(projectId: string, inputText: string) {
  return postJson<AutonomousBuildRunResponse>(`/api/projects/${projectId}/autonomous-build/start`, {
    inputText,
    safeDefaults: true,
  });
}

export async function getAutonomousBuildStatus(projectId: string) {
  return getJson<AutonomousBuildRunResponse>(`/api/projects/${projectId}/autonomous-build/status`);
}

export async function resumeAutonomousBuild(projectId: string, approvedBlockerCodes: string[] = []) {
  return postJson<AutonomousBuildRunResponse>(`/api/projects/${projectId}/autonomous-build/resume`, {
    approvedBlockerCodes,
  });
}

export async function approveAutonomousBuildBlocker(projectId: string, blockerCode: string) {
  return postJson<AutonomousBuildRunResponse>(`/api/projects/${projectId}/autonomous-build/approve-blocker`, {
    blockerCode,
  });
}
