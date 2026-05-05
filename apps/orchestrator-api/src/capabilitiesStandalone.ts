import express from "express";
import { createRuntimeConfig } from "./config";
import { verifyOidcBearerToken } from "./auth/oidc";

async function requireApiAuth(req: express.Request, res: express.Response, next: express.NextFunction) {
  const config = createRuntimeConfig();
  if (!config.auth.enabled) return next();

  const authorization = req.header("authorization") || "";
  const token = authorization.startsWith("Bearer ") ? authorization.slice(7) : "";

  try {
    if (config.auth.implementation === "oidc" && config.auth.oidc) {
      if (!token) throw new Error("Missing bearer token");
      await verifyOidcBearerToken(token, config.auth.oidc);
      return next();
    }

    if (config.auth.implementation === "bearer_token" && config.auth.token) {
      if (token !== config.auth.token) throw new Error("Unauthorized");
      return next();
    }

    return next();
  } catch (error: any) {
    return res.status(401).json({ error: String(error?.message || error), authImplementation: config.auth.implementation });
  }
}

function buildCommercialCapabilities() {
  const config = createRuntimeConfig();
  return {
    status: "ok",
    appName: config.appName,
    runtimeMode: config.runtimeMode,
    repositoryMode: config.repository.mode,
    repositoryImplementation: config.repository.implementation,
    authEnabled: config.auth.enabled,
    authImplementation: config.auth.implementation,
    durableEnvPresent: config.durableEnvPresent,
    queueEnabled: config.repository.mode === "durable",
    capabilities: [
      "health",
      "commercial_health",
      "oidc_auth",
      "durable_repository",
      "dedicated_jobs_table_parallel",
      "project_intake",
      "project_compile",
      "project_plan",
      "project_execution",
      "governance_approval",
      "deployment_gates",
      "ops_metrics"
    ]
  };
}

export function registerStandaloneCapabilityRoutes(app: express.Express) {
  app.get("/registry/capabilities", requireApiAuth, (_req, res) => {
    res.json(buildCommercialCapabilities());
  });

  app.get("/api/registry/capabilities", requireApiAuth, (_req, res) => {
    res.json(buildCommercialCapabilities());
  });
}
