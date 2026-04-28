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

export type ProviderDeploymentRequirement = {
  providerId: DeploymentProviderId;
  requiredSecretsReferenced: string[];
  buildCommandKnown: boolean;
  outputDirectoryKnown: boolean;
  deployCommandTemplatePresent: boolean;
  healthCheckPathKnown: boolean;
  smokePlanPresent: boolean;
  rollbackPlanPresent: boolean;
  rollbackStrategy: string;
};

export const PROVIDER_DEPLOYMENT_REQUIREMENTS: Record<DeploymentProviderId, ProviderDeploymentRequirement> = {
  vercel_web_deploy: {
    providerId: "vercel_web_deploy",
    requiredSecretsReferenced: ["VERCEL_TOKEN", "VERCEL_ORG_ID", "VERCEL_PROJECT_ID", "DATABASE_URL"],
    buildCommandKnown: true, outputDirectoryKnown: true, deployCommandTemplatePresent: true, healthCheckPathKnown: true, smokePlanPresent: true, rollbackPlanPresent: true, rollbackStrategy: "vercel_rollback_last_known_good",
  },
  supabase_backend_deploy: {
    providerId: "supabase_backend_deploy",
    requiredSecretsReferenced: ["SUPABASE_ACCESS_TOKEN", "SUPABASE_PROJECT_REF", "SUPABASE_DB_PASSWORD"],
    buildCommandKnown: true, outputDirectoryKnown: true, deployCommandTemplatePresent: true, healthCheckPathKnown: true, smokePlanPresent: true, rollbackPlanPresent: true, rollbackStrategy: "revert_migration_or_restore_snapshot",
  },
  github_release_handoff: {
    providerId: "github_release_handoff",
    requiredSecretsReferenced: ["GITHUB_TOKEN"],
    buildCommandKnown: true, outputDirectoryKnown: true, deployCommandTemplatePresent: true, healthCheckPathKnown: true, smokePlanPresent: true, rollbackPlanPresent: true, rollbackStrategy: "revert_release_and_restore_previous_artifact",
  },
  mobile_store_handoff: {
    providerId: "mobile_store_handoff",
    requiredSecretsReferenced: ["APP_STORE_CONNECT_API_KEY", "PLAY_STORE_SERVICE_ACCOUNT_JSON", "IOS_SIGNING_CERT", "ANDROID_KEYSTORE"],
    buildCommandKnown: true, outputDirectoryKnown: true, deployCommandTemplatePresent: true, healthCheckPathKnown: true, smokePlanPresent: true, rollbackPlanPresent: true, rollbackStrategy: "store_rollout_pause_or_revert_track",
  },
  bot_platform_deploy: {
    providerId: "bot_platform_deploy",
    requiredSecretsReferenced: ["BOT_TOKEN", "BOT_WEBHOOK_SECRET", "WORKER_DEPLOY_TOKEN"],
    buildCommandKnown: true, outputDirectoryKnown: true, deployCommandTemplatePresent: true, healthCheckPathKnown: true, smokePlanPresent: true, rollbackPlanPresent: true, rollbackStrategy: "worker_revision_rollback",
  },
  ai_agent_runtime_deploy: {
    providerId: "ai_agent_runtime_deploy",
    requiredSecretsReferenced: ["LLM_API_KEY", "LLM_MODEL", "AGENT_RUNTIME_DEPLOY_TOKEN"],
    buildCommandKnown: true, outputDirectoryKnown: true, deployCommandTemplatePresent: true, healthCheckPathKnown: true, smokePlanPresent: true, rollbackPlanPresent: true, rollbackStrategy: "repoint_to_previous_agent_revision",
  },
  game_distribution_handoff: {
    providerId: "game_distribution_handoff",
    requiredSecretsReferenced: ["DISTRIBUTION_SIGNING_KEY", "PLATFORM_PUBLISHER_ACCOUNT"],
    buildCommandKnown: true, outputDirectoryKnown: true, deployCommandTemplatePresent: true, healthCheckPathKnown: true, smokePlanPresent: true, rollbackPlanPresent: true, rollbackStrategy: "revert_to_previous_distributed_build",
  },
  dirty_repo_completion_handoff: {
    providerId: "dirty_repo_completion_handoff",
    requiredSecretsReferenced: ["GIT_HOSTING_TOKEN", "CI_RUNNER_TOKEN"],
    buildCommandKnown: true, outputDirectoryKnown: true, deployCommandTemplatePresent: true, healthCheckPathKnown: true, smokePlanPresent: true, rollbackPlanPresent: true, rollbackStrategy: "git_revert_and_redeploy_previous_revision",
  },
};
