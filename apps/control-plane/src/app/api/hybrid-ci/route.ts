import { NextRequest, NextResponse } from "next/server";
import { execFileSync } from "child_process";
import path from "path";

export const dynamic = "force-dynamic";

type DeploymentHook = {
  environment: "dev" | "staging" | "prod";
  provider: string;
  status: "ready" | "blocked";
  approvalRequired: boolean;
  configured: boolean;
  reason: string;
};

function repoRoot(): string {
  return path.resolve(process.cwd(), "../..");
}

function runGit(args: string[], fallback = ""): string {
  try {
    return execFileSync("git", args, {
      cwd: repoRoot(),
      encoding: "utf8",
      stdio: ["ignore", "pipe", "pipe"],
      timeout: 10000,
    }).trim();
  } catch {
    return fallback;
  }
}

async function githubFetch(pathname: string) {
  const headers: Record<string, string> = {
    Accept: "application/vnd.github+json",
    "User-Agent": "Botomatic-hybrid-ci",
  };
  if (process.env.GITHUB_TOKEN) {
    headers.Authorization = `Bearer ${process.env.GITHUB_TOKEN}`;
  }
  try {
    const owner = process.env.GITHUB_OWNER || process.env.NEXT_PUBLIC_GITHUB_OWNER || "";
    const repo = process.env.GITHUB_REPO || process.env.NEXT_PUBLIC_GITHUB_REPO || "";
    if (!owner || !repo) {
      return { ok: false, status: 0, reason: "github_not_configured", data: null };
    }
    const response = await fetch(`https://api.github.com/repos/${owner}/${repo}${pathname}`, {
      headers,
      cache: "no-store",
    });
    if (!response.ok) {
      return { ok: false, status: response.status, reason: `upstream_http_${response.status}`, data: null };
    }
    return { ok: true, status: response.status, data: await response.json() };
  } catch (err: any) {
    return {
      ok: false,
      status: 0,
      reason: "not_connected",
      error: String(err?.message || err || "Network fetch failed"),
      data: null,
    };
  }
}

async function getActionsRuns() {
  const result = await githubFetch("/actions/runs?per_page=10");
  if (!result.ok) {
    return {
      status: "unavailable",
      reason: result.reason === "not_connected" ? "GitHub Actions unavailable: not_connected" : `GitHub Actions API returned ${result.status}`,
      notConnected: result.reason === "not_connected",
      upstreamStatus: result.status || null,
      error: result.error || null,
      runs: [],
    };
  }
  const runs = Array.isArray(result.data?.workflow_runs) ? result.data.workflow_runs : [];
  return {
    status: "ok",
    runs: runs.map((run: any) => ({
      id: run.id,
      name: run.name,
      event: run.event,
      status: run.status,
      conclusion: run.conclusion,
      branch: run.head_branch,
      sha: run.head_sha,
      url: run.html_url,
      createdAt: run.created_at,
      updatedAt: run.updated_at,
    })),
  };
}

async function getCombinedStatus(sha: string) {
  if (!sha || sha === "unknown") {
    return { status: "unknown", checks: [] };
  }
  const result = await githubFetch(`/commits/${sha}/status`);
  if (!result.ok) {
    return {
      status: "unavailable",
      reason: result.reason === "not_connected" ? "GitHub commit status unavailable: not_connected" : `GitHub commit status API returned ${result.status}`,
      notConnected: result.reason === "not_connected",
      upstreamStatus: result.status || null,
      error: result.error || null,
      checks: [],
    };
  }
  return {
    status: result.data?.state || "unknown",
    checks: Array.isArray(result.data?.statuses)
      ? result.data.statuses.map((check: any) => ({
          context: check.context,
          state: check.state,
          description: check.description,
          targetUrl: check.target_url,
          updatedAt: check.updated_at,
        }))
      : [],
  };
}

function getDeploymentHooks(): DeploymentHook[] {
  const vercelReady = Boolean(process.env.VERCEL_DEPLOY_HOOK_URL || process.env.VERCEL_TOKEN);
  const stagingReady = Boolean(process.env.STAGING_DEPLOY_HOOK_URL || process.env.VERCEL_DEPLOY_HOOK_URL || process.env.VERCEL_TOKEN);
  const prodReady = Boolean(process.env.PROD_DEPLOY_HOOK_URL || process.env.VERCEL_TOKEN);
  return [
    {
      environment: "dev",
      provider: "local",
      status: "ready",
      approvalRequired: false,
      configured: true,
      reason: "Local dev startup is available through start:easy and the Botomatic launcher.",
    },
    {
      environment: "staging",
      provider: "vercel_or_generic_hook",
      status: stagingReady ? "ready" : "blocked",
      approvalRequired: true,
      configured: stagingReady,
      reason: stagingReady
        ? "Staging deployment hook or provider token is configured. Approval is still required before execution."
        : "Missing STAGING_DEPLOY_HOOK_URL, VERCEL_DEPLOY_HOOK_URL, or VERCEL_TOKEN.",
    },
    {
      environment: "prod",
      provider: "vercel_or_generic_hook",
      status: prodReady ? "ready" : "blocked",
      approvalRequired: true,
      configured: prodReady,
      reason: prodReady
        ? "Production deployment credential is configured. Explicit approval is still required."
        : "Missing PROD_DEPLOY_HOOK_URL or VERCEL_TOKEN. Production remains blocked by default.",
    },
  ];
}

async function triggerDeployment(environment: string) {
  if (!environment || !["dev", "staging", "prod"].includes(environment)) {
    return { ok: false, reason: "Invalid deployment environment." };
  }
  if (environment === "prod") {
    return { ok: false, reason: "Production deployment requires explicit governance approval and is blocked through this endpoint." };
  }
  const hookUrl = environment === "staging"
    ? process.env.STAGING_DEPLOY_HOOK_URL || process.env.VERCEL_DEPLOY_HOOK_URL
    : process.env.DEV_DEPLOY_HOOK_URL;
  if (!hookUrl) {
    return { ok: false, reason: `No ${environment.toUpperCase()} deployment hook configured.` };
  }
  try {
    const response = await fetch(hookUrl, { method: "POST" });
    return { ok: response.ok, status: response.status, reason: response.ok ? "Deployment hook triggered." : "Deployment hook failed." };
  } catch (err: any) {
    return { ok: false, reason: String(err?.message || err) };
  }
}

export async function GET() {
  const branch = runGit(["rev-parse", "--abbrev-ref", "HEAD"], "main");
  const sha = runGit(["rev-parse", "HEAD"], "unknown");
  const [actions, combinedStatus] = await Promise.all([
    getActionsRuns(),
    getCombinedStatus(sha),
  ]);

  return NextResponse.json({
    generatedAt: new Date().toISOString(),
    repository: {
      name: "skylersemailaddress-debug/Botomatic",
      branch,
      sha,
      url: "https://github.com/skylersemailaddress-debug/Botomatic",
    },
    localCi: {
      mode: "local_runner",
      statusEndpoint: "/api/local-repo-dashboard",
      streamEndpoint: "/api/local-repo-dashboard/stream",
      autoRunEndpoint: "/api/local-repo-dashboard?autoRunOnChange=1",
    },
    githubActions: actions,
    commitStatus: combinedStatus,
    deploymentHooks: getDeploymentHooks(),
    policy: {
      productionDeployBlockedByDefault: true,
      stagingDeployRequiresApproval: true,
      secretsNeverReturnedToClient: true,
      liveProviderCallsRequireConfiguredHooks: true,
    },
  });
}

export async function POST(request: NextRequest) {
  const body = await request.json().catch(() => ({}));
  const action = String(body?.action || "");
  const environment = String(body?.environment || "");

  if (action !== "trigger_deployment_hook") {
    return NextResponse.json({ ok: false, error: "Unsupported hybrid CI action." }, { status: 400 });
  }

  const result = await triggerDeployment(environment);
  return NextResponse.json(result, { status: result.ok ? 200 : 409 });
}
