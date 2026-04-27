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
};

export async function sendOperatorMessage(projectId: string, message: string): Promise<OperatorSendResponse> {
  return postJson<OperatorSendResponse>(`/api/projects/${encodeURIComponent(projectId)}/operator/send`, {
    message,
  });
}
