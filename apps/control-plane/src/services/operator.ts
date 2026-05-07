import { postJson } from "./api";
import type { SpecQuestion } from "@/types/readiness";

// Re-export for consumers that need the question type directly
export type { SpecQuestion };

export type OperatorSendResponse = {
  ok: boolean;
  route: string;
  status: string;
  blockers: string[];
  nextAction: string;
  actorId: string;
  operatorMessage: string;
  actionResult?: Record<string, unknown>;
  readyToBuild?: boolean;
  lockedReason?: string | null;
  blockingQuestions?: SpecQuestion[];
  canUseRecommendedDefaults?: boolean;
  missingArtifacts?: string[];
  readinessScore?: number;
};

export async function sendOperatorMessage(projectId: string, message: string): Promise<OperatorSendResponse> {
  return postJson<OperatorSendResponse>(`/api/projects/${encodeURIComponent(projectId)}/operator/send`, {
    message,
  });
}
