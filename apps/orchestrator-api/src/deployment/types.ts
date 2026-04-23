export type DeploymentEnvironment = "dev" | "staging" | "prod";

export type DeploymentStatus = "idle" | "promoted" | "failed" | "rolled_back";

export type DeploymentRecord = {
  environment: DeploymentEnvironment;
  status: DeploymentStatus;
  promotedAt?: string;
  promotedBy?: string;
  rollbackAt?: string;
  rollbackBy?: string;
  notes?: string;
};
