import { DeploymentRecord } from "./environment";

export type DeploymentWebhookEvent = {
  projectId: string;
  deploymentId: string;
  environment: "preview" | "staging" | "production";
  status: "pending" | "deployed" | "failed";
  version: string;
  provider?: string;
  receivedAt: string;
};

const webhookEvents: DeploymentWebhookEvent[] = [];

export function recordDeploymentWebhook(event: Omit<DeploymentWebhookEvent, "receivedAt">): DeploymentWebhookEvent {
  const enriched: DeploymentWebhookEvent = {
    ...event,
    receivedAt: new Date().toISOString(),
  };
  webhookEvents.push(enriched);
  return enriched;
}

export function reconcileDeployment(record: DeploymentRecord, event: DeploymentWebhookEvent): DeploymentRecord {
  if (record.deploymentId !== event.deploymentId) {
    throw new Error(`Deployment mismatch: ${record.deploymentId} != ${event.deploymentId}`);
  }

  return {
    ...record,
    environment: event.environment,
    status: event.status,
    version: event.version,
  };
}

export function listWebhookEvents(projectId: string): DeploymentWebhookEvent[] {
  return webhookEvents.filter((event) => event.projectId === projectId);
}
