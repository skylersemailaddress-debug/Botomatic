import fs from "fs";
import path from "path";
import type { RepoValidatorResult } from "../repoValidators";

function has(root: string, rel: string): boolean {
  return fs.existsSync(path.join(root, rel));
}

function read(root: string, rel: string): string {
  return fs.readFileSync(path.join(root, rel), "utf8");
}

function result(ok: boolean, summary: string, checks: string[]): RepoValidatorResult {
  return {
    name: "Validate-Botomatic-DashboardRouteIntegrityReadiness",
    status: ok ? "passed" : "failed",
    summary,
    checks,
  };
}

export function validateDashboardRouteIntegrityReadiness(root: string): RepoValidatorResult {
  const checks: string[] = [];
  const vibePage = "apps/control-plane/src/app/projects/[projectId]/vibe/page.tsx";
  const advancedPage = "apps/control-plane/src/app/projects/[projectId]/advanced/page.tsx";
  const dashboardComponent = "apps/control-plane/src/components/dashboard/RepositorySuccessDashboard.tsx";
  const dashboardRoute = "apps/control-plane/src/app/api/local-repo-dashboard/route.ts";
  const hybridRoute = "apps/control-plane/src/app/api/hybrid-ci/route.ts";
  const nextConfig = "apps/control-plane/next.config.mjs";

  if (!has(root, vibePage)) {
    return result(false, `Vibe project route is missing: ${vibePage}`, checks);
  }
  checks.push("Vibe project route exists");

  if (!has(root, advancedPage)) {
    return result(false, `Advanced project route is missing: ${advancedPage}`, checks);
  }
  checks.push("Advanced project route exists");

  if (!has(root, dashboardComponent)) {
    return result(false, `RepositorySuccessDashboard component is missing: ${dashboardComponent}`, checks);
  }
  const dashboardText = read(root, dashboardComponent);
  const supportsModes =
    dashboardText.includes("mode?: \"vibe\" | \"pro\"") &&
    dashboardText.includes("projectId?: string");
  if (!supportsModes) {
    return result(false, "RepositorySuccessDashboard does not support both vibe and pro modes with projectId.", checks);
  }
  checks.push("RepositorySuccessDashboard supports projectId and mode vibe|pro");

  if (dashboardText.includes("/api/local-repo-dashboard") && !has(root, dashboardRoute)) {
    return result(false, `Dashboard UI references /api/local-repo-dashboard but route file is missing: ${dashboardRoute}`, checks);
  }
  checks.push("Dashboard local-repo-dashboard route integrity is valid");

  if (dashboardText.includes("/api/hybrid-ci") && !has(root, hybridRoute)) {
    return result(false, `Dashboard UI references /api/hybrid-ci but route file is missing: ${hybridRoute}`, checks);
  }
  checks.push("Dashboard hybrid-ci route integrity is valid");

  if (!has(root, nextConfig)) {
    return result(false, `Next config is missing: ${nextConfig}`, checks);
  }
  const nextConfigText = read(root, nextConfig);
  const localDashboardPos = nextConfigText.indexOf('source: "/api/local-repo-dashboard"');
  const localDashboardNestedPos = nextConfigText.indexOf('source: "/api/local-repo-dashboard/:path*"');
  const hybridPos = nextConfigText.indexOf('source: "/api/hybrid-ci"');
  const hybridNestedPos = nextConfigText.indexOf('source: "/api/hybrid-ci/:path*"');
  const catchAllPos = nextConfigText.indexOf('source: "/api/:path*"');
  const rewritesIntegrityOk =
    localDashboardPos !== -1 &&
    localDashboardNestedPos !== -1 &&
    hybridPos !== -1 &&
    hybridNestedPos !== -1 &&
    catchAllPos !== -1 &&
    localDashboardPos < catchAllPos &&
    localDashboardNestedPos < catchAllPos &&
    hybridPos < catchAllPos &&
    hybridNestedPos < catchAllPos;
  if (!rewritesIntegrityOk) {
    return result(false, "next.config.mjs does not preserve local dashboard routes before /api catch-all proxy.", checks);
  }
  checks.push("next.config.mjs preserves dashboard routes before catch-all API proxy");

  return result(true, "Dashboard route integrity readiness is satisfied across vibe/pro routes, dashboard API routes, and rewrite order.", checks);
}
