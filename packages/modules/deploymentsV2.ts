import { saveDeploymentDB, getDeploymentsDB } from "../persistence/src/deploymentRepo";
import { DeploymentRecord } from "../release/src/environment";

export async function recordDeploymentV2(record: DeploymentRecord & { provider?: string }) {
  await saveDeploymentDB({ ...record, provider: record.provider, webhook_status: "pending" });
  return record;
}

export async function updateDeploymentFromWebhookV2(input: {
  deploymentId: string;
  status: string;
}) {
  const deployments = await getDeploymentsDB("*");
  const match = deployments.find(d => d.deploymentId === input.deploymentId);

  if (!match) {
    throw new Error("Deployment not found for webhook update");
  }

  const updated = {
    ...match,
    status: input.status,
    webhook_status: "synced",
  };

  await saveDeploymentDB(updated);
  return updated;
}

export async function listDeploymentsV2(projectId: string) {
  return getDeploymentsDB(projectId);
}
