/**
 * Real cloud deployment calls for Vercel and Railway.
 * Triggered from the promote endpoint after governance + provider gate pass.
 */

export type DeployResult = {
  provider: "vercel" | "railway" | "none";
  success: boolean;
  deploymentId?: string;
  deploymentUrl?: string;
  error?: string;
  skipped?: boolean;
  reason?: string;
};

// ── Vercel ────────────────────────────────────────────────────────────────────

async function deployToVercel(opts: {
  projectName: string;
  gitBranch: string;
  gitOwner: string;
  gitRepo: string;
  environment: string;
}): Promise<DeployResult> {
  const token = process.env.VERCEL_TOKEN;
  if (!token || token === "replace_me") {
    return { provider: "vercel", success: false, skipped: true, reason: "VERCEL_TOKEN not configured" };
  }

  // Trigger a Vercel deployment via their REST API (git integration path)
  const body = {
    name: opts.projectName.toLowerCase().replace(/[^a-z0-9-]/g, "-").slice(0, 52),
    gitSource: {
      type: "github",
      org:  opts.gitOwner,
      repo: opts.gitRepo,
      ref:  opts.gitBranch,
    },
    target: opts.environment === "prod" ? "production" : "preview",
  };

  const resp = await fetch("https://api.vercel.com/v13/deployments", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(body),
  });

  const data = await resp.json() as any;

  if (!resp.ok) {
    return { provider: "vercel", success: false, error: data?.error?.message || `HTTP ${resp.status}` };
  }

  return {
    provider: "vercel",
    success: true,
    deploymentId: data.id,
    deploymentUrl: data.url ? `https://${data.url}` : undefined,
  };
}

// ── Railway ───────────────────────────────────────────────────────────────────

async function deployToRailway(opts: {
  projectName: string;
  environment: string;
}): Promise<DeployResult> {
  const token = process.env.RAILWAY_TOKEN;
  if (!token || token === "replace_me") {
    return { provider: "railway", success: false, skipped: true, reason: "RAILWAY_TOKEN not configured" };
  }

  // Railway uses GraphQL API. Create or redeploy a service.
  const query = `
    mutation ServiceInstanceDeploy($environmentId: String!, $serviceId: String!) {
      serviceInstanceDeploy(environmentId: $environmentId, serviceId: $serviceId)
    }
  `;

  // Railway service/env IDs should come from env vars (project-specific)
  const serviceId = process.env.RAILWAY_SERVICE_ID;
  const environmentId = process.env.RAILWAY_ENVIRONMENT_ID;

  if (!serviceId || !environmentId) {
    return {
      provider: "railway",
      success: false,
      skipped: true,
      reason: "RAILWAY_SERVICE_ID and RAILWAY_ENVIRONMENT_ID not configured",
    };
  }

  const resp = await fetch("https://backboard.railway.app/graphql/v2", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ query, variables: { serviceId, environmentId } }),
  });

  const data = await resp.json() as any;

  if (!resp.ok || data.errors?.length) {
    const msg = data.errors?.[0]?.message || `HTTP ${resp.status}`;
    return { provider: "railway", success: false, error: msg };
  }

  return { provider: "railway", success: true, deploymentId: data.data?.serviceInstanceDeploy };
}

// ── Router ────────────────────────────────────────────────────────────────────

export async function triggerDeployment(opts: {
  projectName: string;
  gitBranch: string;
  gitOwner: string;
  gitRepo: string;
  environment: string;
}): Promise<DeployResult> {
  // Prefer Vercel if token set; fall back to Railway; report none if neither configured
  const vercelToken = process.env.VERCEL_TOKEN;
  const railwayToken = process.env.RAILWAY_TOKEN;

  if (vercelToken && vercelToken !== "replace_me") {
    return deployToVercel(opts);
  }
  if (railwayToken && railwayToken !== "replace_me") {
    return deployToRailway(opts);
  }
  return {
    provider: "none",
    success: true,
    skipped: true,
    reason: "No deployment provider configured (VERCEL_TOKEN or RAILWAY_TOKEN required)",
  };
}
