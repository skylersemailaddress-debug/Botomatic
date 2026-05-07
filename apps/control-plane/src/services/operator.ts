import { postJson } from "./api";

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
  lockedReason?: string;
  blockingQuestions?: Array<{
    id: string;
    label?: string;
    question?: string;
    plainEnglish?: string;
    technicalDetail?: string;
    category?: string;
    risk?: string;
    status?: string;
    recommendedDefault?: string;
  }>;
  canUseRecommendedDefaults?: boolean;
  missingArtifacts?: Array<{
    id?: string;
    label?: string;
    reason?: string;
  }>;
  readinessScore?: number;
};

export async function sendOperatorMessage(projectId: string, message: string): Promise<OperatorSendResponse> {
  return postJson<OperatorSendResponse>(`/api/projects/${encodeURIComponent(projectId)}/operator/send`, {
    message,
  });
}
