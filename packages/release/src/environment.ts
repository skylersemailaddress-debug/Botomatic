export type Environment = "preview" | "staging" | "production";

export type DeploymentRecord = {
  deploymentId: string;
  projectId: string;
  environment: Environment;
  version: string;
  status: "pending" | "deployed" | "failed";
  createdAt: string;
};

const deployments: DeploymentRecord[] = [];

export function createDeployment(input: Omit<DeploymentRecord, "deploymentId" | "createdAt">) {
  const record: DeploymentRecord = {
    deploymentId: `dep_${Date.now()}_${Math.random().toString(36).slice(2,6)}`,
    createdAt: new Date().toISOString(),
    ...input,
  };

  deployments.push(record);
  return record;
}

export function listDeployments(projectId: string) {
  return deployments.filter(d => d.projectId === projectId);
}
