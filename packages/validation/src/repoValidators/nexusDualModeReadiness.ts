import fs from "fs";
import path from "path";
import type { RepoValidatorResult } from "../repoValidators";

function result(ok: boolean, summary: string, checks: string[]): RepoValidatorResult {
  return {
    name: "Validate-Botomatic-NexusDualModeReadiness",
    status: ok ? "passed" : "failed",
    summary,
    checks,
  };
}

function has(root: string, rel: string): boolean {
  return fs.existsSync(path.join(root, rel));
}

function read(root: string, rel: string): string {
  return fs.readFileSync(path.join(root, rel), "utf8");
}

export function validateNexusDualModeReadiness(root: string): RepoValidatorResult {
  const checks = [
    "apps/control-plane/src/app/projects/[projectId]/page.tsx",
    "apps/control-plane/src/app/projects/[projectId]/vibe/page.tsx",
    "apps/control-plane/src/app/projects/[projectId]/advanced/page.tsx",
    "apps/control-plane/src/components/dashboard/RepositorySuccessDashboard.tsx",
    "apps/control-plane/src/components/nexus/NexusSidebar.tsx",
    "apps/control-plane/src/components/nexus/NexusTopbar.tsx",
    "apps/control-plane/src/styles/globals.css",
  ];

  if (!checks.every((file) => has(root, file))) {
    return result(false, "Dual-mode Nexus readiness failed: required route/shell files are missing.", checks);
  }

  const projectPage = read(root, "apps/control-plane/src/app/projects/[projectId]/page.tsx");
  const vibePage = read(root, "apps/control-plane/src/app/projects/[projectId]/vibe/page.tsx");
  const advancedPage = read(root, "apps/control-plane/src/app/projects/[projectId]/advanced/page.tsx");
  const dashboard = read(root, "apps/control-plane/src/components/dashboard/RepositorySuccessDashboard.tsx");
  const css = read(root, "apps/control-plane/src/styles/globals.css");

  const routeReadinessOk =
    projectPage.includes("<RepositorySuccessDashboard") &&
    vibePage.includes("mode=\"vibe\"") &&
    advancedPage.includes("mode=\"pro\"");

  const sharedDesignOk =
    dashboard.includes("import NexusSidebar") &&
    dashboard.includes("import NexusTopbar") &&
    dashboard.includes("<NexusSidebar") &&
    dashboard.includes("<NexusTopbar") &&
    css.includes(".nexus-shell") &&
    css.includes(".nexus-sidebar") &&
    css.includes(".nexus-topbar") &&
    css.includes(".nexus-chatbar");

  const vibeSurfaceOk =
    dashboard.includes("Central Workspace") &&
    dashboard.includes("Build Map") &&
    dashboard.includes("Live Design Canvas") &&
    dashboard.includes("App Health") &&
    dashboard.includes("What’s Next") &&
    dashboard.includes("Recent Activity") &&
    dashboard.includes("One-Click Launch") &&
    [
      "Improve Design",
      "Add Page",
      "Add Feature",
      "Connect Payments",
      "Run Tests",
      "Launch App",
    ].every((label) => dashboard.includes(label));

  const proSurfaceOk =
    dashboard.includes("AI Copilot") &&
    dashboard.includes("Build Pipeline") &&
    dashboard.includes("System Health") &&
    dashboard.includes("Code Changes") &&
    dashboard.includes("Live Application") &&
    dashboard.includes("Services") &&
    dashboard.includes("Database Schema") &&
    dashboard.includes("Test Results") &&
    dashboard.includes("Terminal / Logs") &&
    dashboard.includes("Recent Commits") &&
    dashboard.includes("nexus-status-strip");

  const sharedActionPathOk =
    dashboard.includes("const SHARED_INTENTS") &&
    dashboard.includes("dispatchAction") &&
    dashboard.includes("runOneAction") &&
    dashboard.includes("onClick={() => dispatchAction({ intent: chip.intent })}") &&
    dashboard.includes("onClick={() => dispatchAction({ input: chip })}") &&
    dashboard.includes("onDeploy={() => dispatchAction({ intent: \"deploy\" })}");

  const noFakeClaimsOk =
    dashboard.includes("Approval required") &&
    dashboard.includes("Deploy: blocked") &&
    dashboard.includes("API: unknown") &&
    dashboard.includes("No logs yet.") &&
    dashboard.includes("Putting your app live stays approval-gated.") &&
    !dashboard.toLowerCase().includes("deployed live");

  const ok =
    routeReadinessOk &&
    sharedDesignOk &&
    vibeSurfaceOk &&
    proSurfaceOk &&
    sharedActionPathOk &&
    noFakeClaimsOk;

  return result(
    ok,
    ok
      ? "Dual-mode Nexus routes, shared shell/design system, Vibe+Pro surfaces, shared action path, and no-fake-claim guardrails are present."
      : "Dual-mode Nexus readiness failed (route, shared shell, surface, action-path, or no-fake-claim checks).",
    checks
  );
}
