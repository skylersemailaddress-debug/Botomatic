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
      repairAttemptsBySignature: Record<string, number>;
      repairAttemptsByMilestoneCategory: Record<string, number>;
      repairHistory: Array<{
        milestoneId: string;
        failureCategory: string;
        failureSignature: string;
        repairAction: string;
        outcome: "repaired" | "failed" | "skipped";
        reason: string;
        attemptedAt: string;
      }>;
      lastFailure: {
        runId: string;
        milestoneId: string;
        failureCategory: string;
        confidence: number;
        evidence: string[];
        lastError: string;
        failingCommand: string;
        affectedFiles: string[];
        affectedSubsystem: string;
        safeRepairAvailable: boolean;
        recommendedRepair: string;
        escalationRequired: boolean;
        userQuestion?: string;
        resumeCommand: string;
        validationCommandAfterRepair: string;
        failureSignature: string;
        attemptsBySignature: number;
        attemptsByMilestoneCategory: number;
        attemptedRepairs: string[];
        recommendedStrategyId?: string;
        recommendedStrategyName?: string;
        whyThisStrategy?: string;
        rejectedStrategies: Array<{ strategyId: string; reason: string }>;
        priorSimilarOutcomes: Array<{
          strategyId: string;
          outcome: "success" | "failed" | "skipped" | "escalated";
          timestamp: string;
          notes: string;
        }>;
        approvalRequired: boolean;
        expectedValidationCommand: string;
        rollbackPlan: string;
        repairBudgetExhausted?: {
          whatFailed: string;
          attemptedRepairs: string[];
          whyRepairsFailed: string;
          exactNextAction: string;
        };
      } | null;
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
