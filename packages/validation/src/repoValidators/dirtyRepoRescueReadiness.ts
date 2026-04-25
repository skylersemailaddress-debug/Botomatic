import fs from "fs";
import path from "path";

import { validateExistingRepoReadiness } from "../existingRepo/validateExistingRepoReadiness";

export type RepoValidatorResult = {
  name: string;
  status: "passed" | "failed";
  summary: string;
  checks: string[];
};

function has(root: string, rel: string): boolean {
  return fs.existsSync(path.join(root, rel));
}

function read(root: string, rel: string): string {
  return fs.readFileSync(path.join(root, rel), "utf8");
}

function result(name: string, ok: boolean, summary: string, checks: string[]): RepoValidatorResult {
  return { name, status: ok ? "passed" : "failed", summary, checks };
}

export function validateDirtyRepoRescueReadiness(root: string): RepoValidatorResult {
  const checks = [
    "packages/repo-intake/src/index.ts",
    "packages/repo-audit/src/index.ts",
    "packages/repo-repair/src/index.ts",
    "packages/repo-completion/src/index.ts",
    "packages/validation/src/existingRepo/validateExistingRepoReadiness.ts",
    "apps/orchestrator-api/src/server_app.ts",
  ];

  const fileOk = checks.every((p) => has(root, p));
  if (!fileOk) {
    return result(
      "Validate-Botomatic-DirtyRepoRescueReadiness",
      false,
      "Dirty-repo rescue package surface is incomplete.",
      checks
    );
  }

  const api = read(root, "apps/orchestrator-api/src/server_app.ts");
  const apiWired =
    api.includes("/api/projects/:projectId/repo/completion-contract") &&
    api.includes("/api/projects/:projectId/repo/status") &&
    api.includes("existing_repo_completion_contract");

  const smoke = validateExistingRepoReadiness({
    sourceText: "production-ready app",
    installWorks: true,
    buildWorks: true,
    testsPass: true,
    testsWereAddedIfMissing: true,
    authReal: true,
    roleGuardsReal: true,
    fakeAuthOrPaymentOrMessaging: false,
    deploymentPathReal: true,
    envManifestExists: true,
    launchReadmeExists: true,
    coreWorkflowsComplete: true,
    dataPersistenceReal: true,
    uiStatesComplete: true,
  });

  const ok = apiWired && smoke.ok;
  return result(
    "Validate-Botomatic-DirtyRepoRescueReadiness",
    ok,
    ok
      ? "Dirty-repo intake/audit/repair/completion flow is present and wired into API/operator path."
      : "Dirty-repo flow is partially wired (missing API integration or validator smoke failed).",
    checks
  );
}
