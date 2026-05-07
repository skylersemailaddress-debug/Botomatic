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
  const canonicalProjectPage = "apps/control-plane/src/app/projects/[projectId]/page.tsx";
  const appShell = "apps/control-plane/src/components/shell/AppShell.tsx";
  const vibeDashboard = "apps/control-plane/src/components/vibe/VibeDashboard.tsx";
  const dashboardComponent = "apps/control-plane/src/components/dashboard/RepositorySuccessDashboard.tsx";
  const dashboardRoute = "apps/control-plane/src/app/api/local-repo-dashboard/route.ts";
  const hybridRoute = "apps/control-plane/src/app/api/hybrid-ci/route.ts";
  const nextConfig = "apps/control-plane/next.config.mjs";
  const legacyVibePage = "apps/control-plane/src/app/projects/[projectId]/vibe/page.tsx";
  const legacyAdvancedPage = "apps/control-plane/src/app/projects/[projectId]/advanced/page.tsx";

  for (const rel of [canonicalProjectPage, appShell, vibeDashboard]) {
    if (!has(root, rel)) return result(false, `Canonical dashboard surface is missing: ${rel}`, checks);
    checks.push(`Canonical dashboard surface exists: ${rel}`);
  }

  if (has(root, legacyVibePage) || has(root, legacyAdvancedPage)) {
    return result(false, "Legacy /vibe or /advanced project routes should not be restored without a new canonical product decision.", checks);
  }
  checks.push("Legacy /vibe and /advanced project routes are not required by the canonical route map");

  const projectPageText = read(root, canonicalProjectPage);
  const vibeDashboardText = read(root, vibeDashboard);
  const appShellText = read(root, appShell);
  if ((!projectPageText.includes("VibeDashboard") && !projectPageText.includes("BetaHQ")) || !vibeDashboardText.includes("<AppShell") || !appShellText.includes("Product navigation")) {
    return result(false, "Canonical project route does not wire VibeDashboard through AppShell navigation.", checks);
  }
  checks.push("Canonical /projects/[projectId] route wires VibeDashboard or BetaHQ through AppShell");

  if (has(root, dashboardComponent)) {
    const dashboardText = read(root, dashboardComponent);
    if (dashboardText.includes("/api/local-repo-dashboard") && !has(root, dashboardRoute)) {
      return result(false, `Dashboard UI references /api/local-repo-dashboard but route file is missing: ${dashboardRoute}`, checks);
    }
    if (dashboardText.includes("/api/hybrid-ci") && !has(root, hybridRoute)) {
      return result(false, `Dashboard UI references /api/hybrid-ci but route file is missing: ${hybridRoute}`, checks);
    }
    checks.push("RepositorySuccessDashboard legacy API route references remain backed when present");
  }

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

  return result(true, "Dashboard route integrity readiness is aligned to canonical /projects/[projectId] AppShell/VibeDashboard route and dashboard API rewrite order.", checks);
}
