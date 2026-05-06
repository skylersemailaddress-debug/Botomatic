import { InMemoryProjectRepository } from "../../../packages/supabase-adapter/src/memoryRepo";
import { DurableProjectRepository } from "../../../packages/supabase-adapter/src/durableRepo";
import { ProjectRepository } from "../../../packages/supabase-adapter/src/types";
import path from "path";
import { getIntakeLimitsFromEnv, type IntakeLimits } from "./intake/largeFileIntake";

export type RepositoryMode = "memory" | "durable";
export type AuthImplementation = "bearer_token" | "oidc" | "local_test_headers" | "disabled";
export type RuntimeMode = "commercial" | "development";
export type DeploymentEnvironment = "local" | "beta" | "production";

export type RepositoryContext = {
  repo: ProjectRepository;
  mode: RepositoryMode;
  implementation: string;
};

export type OidcConfig = {
  issuerUrl: string;
  clientId: string;
  audience?: string;
};

export type AuthContext = {
  enabled: boolean;
  implementation: AuthImplementation;
  token?: string;
  oidc?: OidcConfig;
};

export type RuntimeConfig = {
  appName: string;
  runtimeMode: RuntimeMode;
  port: number;
  startupTimestamp: string;
  commitSha: string | null;
  durableEnvPresent: boolean;
  repository: RepositoryContext;
  auth: AuthContext;
  deploymentEnvironment: DeploymentEnvironment;
  hosted: boolean;
  alertWebhookUrl: string | null;
  intake: {
    limits: IntakeLimits;
    uploadDir: string;
  };
};

function now(): string {
  return new Date().toISOString();
}

function getRuntimeMode(): RuntimeMode {
  return process.env.RUNTIME_MODE === "commercial" ? "commercial" : "development";
}

function getDeploymentEnvironment(): DeploymentEnvironment {
  const raw = (
    process.env.BOTOMATIC_DEPLOYMENT_ENV ||
    process.env.BOTOMATIC_ENV ||
    process.env.VERCEL_ENV ||
    process.env.NODE_ENV ||
    "local"
  ).toLowerCase();

  if (["production", "prod"].includes(raw)) return "production";
  if (["beta", "preview", "staging"].includes(raw)) return "beta";
  return "local";
}

function isHostedEnvironment(deploymentEnvironment: DeploymentEnvironment): boolean {
  return deploymentEnvironment === "beta" || deploymentEnvironment === "production";
}

function getRepositoryMode(): RepositoryMode {
  return process.env.PROJECT_REPOSITORY_MODE === "durable" ? "durable" : "memory";
}

function getCommitSha(): string | null {
  return process.env.GITHUB_SHA || process.env.COMMIT_SHA || null;
}

function requireEnv(name: string): string {
  const value = process.env[name];
  if (!value) {
    throw new Error(`Missing required environment variable: ${name}`);
  }
  return value;
}

function createRepositoryContext(runtimeMode: RuntimeMode): RepositoryContext {
  const mode = getRepositoryMode();

  if (mode === "durable") {
    const baseUrl = requireEnv("SUPABASE_URL");
    const serviceRoleKey = requireEnv("SUPABASE_SERVICE_ROLE_KEY");

    return {
      repo: new DurableProjectRepository({
        baseUrl,
        serviceRoleKey,
      }),
      mode,
      implementation: "DurableProjectRepository",
    };
  }

  if (runtimeMode === "commercial") {
    throw new Error("Commercial mode requires PROJECT_REPOSITORY_MODE=durable");
  }

  return {
    repo: new InMemoryProjectRepository(),
    mode,
    implementation: "InMemoryProjectRepository",
  };
}

function createAuthContext(runtimeMode: RuntimeMode, hosted: boolean): AuthContext {
  const oidcIssuer = process.env.OIDC_ISSUER_URL;
  const oidcClientId = process.env.OIDC_CLIENT_ID;
  const oidcAudience = process.env.OIDC_AUDIENCE;

  if ((oidcIssuer && !oidcClientId) || (!oidcIssuer && oidcClientId)) {
    throw new Error("OIDC auth requires both OIDC_ISSUER_URL and OIDC_CLIENT_ID");
  }

  if (oidcIssuer && oidcClientId) {
    return {
      enabled: true,
      implementation: "oidc",
      oidc: {
        issuerUrl: oidcIssuer,
        clientId: oidcClientId,
        audience: oidcAudience,
      },
    };
  }

  const token = process.env.API_AUTH_TOKEN;

  if (hosted) {
    throw new Error("Hosted beta/production requires OIDC_ISSUER_URL and OIDC_CLIENT_ID");
  }

  if (runtimeMode === "development" && process.env.BOTOMATIC_LOCAL_TEST_AUTH === "true") {
    return {
      enabled: true,
      implementation: "local_test_headers",
    };
  }

  if (token) {
    return {
      enabled: true,
      implementation: "bearer_token",
      token,
    };
  }

  if (runtimeMode === "commercial") {
    throw new Error("Commercial mode requires OIDC or API_AUTH_TOKEN outside hosted beta/production");
  }

  return {
    enabled: false,
    implementation: "disabled",
  };
}

export function createRuntimeConfig(): RuntimeConfig {
  const runtimeMode = getRuntimeMode();
  const deploymentEnvironment = getDeploymentEnvironment();
  const hosted = isHostedEnvironment(deploymentEnvironment);

  if (hosted && runtimeMode === "development") {
    throw new Error("Hosted beta/production cannot run with RUNTIME_MODE=development");
  }
  const durableEnvPresent = Boolean(process.env.SUPABASE_URL && process.env.SUPABASE_SERVICE_ROLE_KEY);
  const repository = createRepositoryContext(runtimeMode);
  const auth = createAuthContext(runtimeMode, hosted);
  const alertWebhookUrl = process.env.BOTOMATIC_ALERT_WEBHOOK_URL || process.env.SLACK_WEBHOOK_URL || null;
  const limits = getIntakeLimitsFromEnv(process.env);
  const uploadDir = process.env.BOTOMATIC_UPLOAD_DIR || path.join(process.cwd(), "runtime", "uploads");

  return {
    appName: "botomatic-orchestrator-api",
    runtimeMode,
    port: Number(process.env.PORT || 3000),
    startupTimestamp: now(),
    commitSha: getCommitSha(),
    durableEnvPresent,
    repository,
    auth,
    deploymentEnvironment,
    hosted,
    alertWebhookUrl,
    intake: {
      limits,
      uploadDir,
    },
  };
}
