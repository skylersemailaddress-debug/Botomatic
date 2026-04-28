export type DeploymentProviderId =
  | "vercel_web_deploy"
  | "supabase_backend_deploy"
  | "github_release_handoff"
  | "mobile_store_handoff"
  | "bot_platform_deploy"
  | "ai_agent_runtime_deploy"
  | "game_distribution_handoff"
  | "dirty_repo_completion_handoff";

export type DeploymentEnvironmentId = "dev" | "staging" | "prod";

export type ProviderHandoffContract = {
  providerId: DeploymentProviderId;
  environment: DeploymentEnvironmentId;
  requiredSecretsReferenced: string[];
  buildCommandKnown: boolean;
  outputDirectoryKnown: boolean;
  deployCommandTemplatePresent: boolean;
  healthCheckPathKnown: boolean;
  smokePlanPresent: boolean;
  rollbackPlanPresent: boolean;
  approvalRequired: true;
};

export type ProviderHandoffCompleteness = ProviderHandoffContract & {
  status: "complete" | "incomplete" | "blocked";
};

export type ProviderRollbackContract = {
  providerId: DeploymentProviderId;
  environment: DeploymentEnvironmentId;
  rollbackStrategy: string;
  rollbackCommandTemplatePresent: boolean;
  previousVersionReferenceRequired: boolean;
  dataRollbackBoundaryDocumented: boolean;
  approvalRequired: true;
};

export type ProviderRollbackCompleteness = ProviderRollbackContract & {
  status: "complete" | "incomplete" | "blocked";
};

export type ProviderSmokeContract = {
  providerId: DeploymentProviderId;
  environment: DeploymentEnvironmentId;
  healthCheckPathKnown: boolean;
  smokePlanPresent: boolean;
  status: "complete" | "incomplete" | "blocked";
};

export type ProviderSecretPreflightLinkage = {
  providerId: DeploymentProviderId;
  environment: DeploymentEnvironmentId;
  usesSecretReferencesOnly: boolean;
  missingSecretRefs: string[];
  plaintextSecretsStored: false;
  preflightRequiredBeforeDeploy: true;
};
