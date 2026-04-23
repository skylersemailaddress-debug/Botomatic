export type DeploymentHistoryAction = "promote" | "rollback";

export type DeploymentHistoryEntry = {
  environment: "dev" | "staging" | "prod";
  action: DeploymentHistoryAction;
  actorId: string;
  timestamp: string;
  notes?: string;
};
