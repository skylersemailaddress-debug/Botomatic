import { postJson } from "./api";

export type OperatorBlockingQuestion = {
  id: string;
  field: string;
  question: string;
  plainEnglish: string;
  risk: string;
  suggestedDefault: string | null;
};

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
  blockingQuestions?: OperatorBlockingQuestion[];
  canUseRecommendedDefaults?: boolean;
  missingArtifacts?: string[];
  readinessScore?: number;
};

export async function sendOperatorMessage(projectId: string, message: string): Promise<OperatorSendResponse> {
  return postJson<OperatorSendResponse>(`/api/projects/${encodeURIComponent(projectId)}/operator/send`, {
    message,
  });
}
