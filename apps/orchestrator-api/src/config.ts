import { InMemoryProjectRepository } from "../../../packages/supabase-adapter/src/memoryRepo";
import { DurableProjectRepository } from "../../../packages/supabase-adapter/src/durableRepo";
import { ProjectRepository } from "../../../packages/supabase-adapter/src/types";

export type RepositoryMode = "memory" | "durable";
export type AuthImplementation = "bearer_token" | "oidc" | "disabled";
export type RuntimeMode = "commercial" | "development";

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
};

function now(): string {
  return new Date().toISOString();
}

function getRuntimeMode(): RuntimeMode {
  return process.env.RUNTIME_MODE === "commercial" ? "commercial" : "development";
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

function createAuthContext(runtimeMode: RuntimeMode): AuthContext {
  const oidcIssuer = process.env.OIDC_ISSUER_URL;
  const oidcClientId = process.env.OIDC_CLIENT_ID;

  if (oidcIssuer && oidcClientId) {
    return {
      enabled: true,
      implementation: "oidc",
      oidc: {
        issuerUrl: oidcIssuer,
        clientId: oidcClientId,
        audience: process.env.OIDC_AUDIENCE,
      },
    };
  }

  const token = process.env.API_AUTH_TOKEN;

  if (token) {
    return {
      enabled: true,
      implementation: "bearer_token",
      token,
    };
  }

  if (runtimeMode === "commercial") {
    throw new Error("Commercial mode requires OIDC or API_AUTH_TOKEN");
  }

  return {
    enabled: false,
    implementation: "disabled",
  };
}

export function createRuntimeConfig(): RuntimeConfig {
  const runtimeMode = getRuntimeMode();
  const durableEnvPresent = Boolean(process.env.SUPABASE_URL && process.env.SUPABASE_SERVICE_ROLE_KEY);
  const repository = createRepositoryContext(runtimeMode);
  const auth = createAuthContext(runtimeMode);

  return {
    appName: "botomatic-orchestrator-api",
    runtimeMode,
    port: Number(process.env.PORT || 3000),
    startupTimestamp: now(),
    commitSha: getCommitSha(),
    durableEnvPresent,
    repository,
    auth,
  };
}
