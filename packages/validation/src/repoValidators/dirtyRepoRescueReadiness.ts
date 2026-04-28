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
    "packages/validation/src/tests/dirtyRepoCompletionContractV2.test.ts",
    "docs/dirty-repo-completion-contract-v2.md",
    "packages/validation/src/existingRepo/validateExistingRepoReadiness.ts",
    "apps/orchestrator-api/src/server_app.ts",
    "release-evidence/runtime/dirty_repo_runtime_proof.json",
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

  let runtimeProof: any = null;
  try {
    runtimeProof = JSON.parse(read(root, "release-evidence/runtime/dirty_repo_runtime_proof.json"));
  } catch {
    runtimeProof = null;
  }

  const proofRoutes = Array.isArray(runtimeProof?.routeExercised) ? runtimeProof.routeExercised : [];
  const completionPlan = runtimeProof?.generatedPlanOrBuildGraph?.recommendedCompletionPlan;
  const repairPlan = runtimeProof?.generatedPlanOrBuildGraph?.repairPlan;
  const completionContractPayload = runtimeProof?.contract?.payload || {};
  const producedArtifacts = Array.isArray(runtimeProof?.producedArtifacts) ? runtimeProof.producedArtifacts : [];
  const validatorsRun = Array.isArray(runtimeProof?.validatorsRun) ? runtimeProof.validatorsRun : [];
  const hasIntakeEvidence = producedArtifacts.includes("repoIntake");
  const hasAuditEvidence = producedArtifacts.includes("repoAudit");
  const hasCompletionEvidence = producedArtifacts.includes("completionContract");
  const hasRepairEvidence = producedArtifacts.includes("repairPlan");
  const hasDetectionEvidence =
    Array.isArray(completionContractPayload?.detectedStack) &&
    completionContractPayload.detectedStack.length >= 1;
  const hasCompletionContractShape =
    Array.isArray(completionContractPayload?.recommendedCompletionPlan) &&
    completionContractPayload.recommendedCompletionPlan.length >= 2 &&
    Array.isArray(completionContractPayload?.commercialLaunchBlockers);
  const completionRunner = read(root, "packages/repo-completion/src/completionRunner.ts");
  const hasV2Boundary =
    completionRunner.includes("DirtyRepoCompletionContractV2") &&
    completionRunner.includes("candidate_ready") &&
    !completionRunner.includes("launch_ready") &&
    !completionRunner.includes("production_ready");
    Array.isArray(repairPlan?.patchQueue) &&
    Array.isArray(repairPlan?.testQueue) &&
    Array.isArray(repairPlan?.hardeningQueue);
  const ranExistingRepoValidator = validatorsRun.some((v: any) => v?.name === "validateExistingRepoReadiness");
  const ranIncrementalValidation = validatorsRun.some((v: any) =>
    String(v?.name || "").toLowerCase().includes("existingrepo") ||
    String(v?.name || "").toLowerCase().includes("incremental")
  );
  const proofOk =
    runtimeProof?.pathId === "dirty_repo_rescue_completion" &&
    runtimeProof?.proofGrade === "local_runtime" &&
    runtimeProof?.status === "passed" &&
    runtimeProof?.contract?.type === "completion_contract" &&
    proofRoutes.some((r: any) => String(r?.path || "").includes("/repo/completion-contract") && r?.ok === true) &&
    proofRoutes.some((r: any) => String(r?.path || "").includes("/repo/status") && r?.ok === true) &&
    hasIntakeEvidence &&
    hasAuditEvidence &&
    hasCompletionEvidence &&
    hasRepairEvidence &&
    hasDetectionEvidence &&
    hasCompletionContractShape &&
    hasV2Boundary &&
    hasRepairPlanShape &&
    ranExistingRepoValidator &&
    ranIncrementalValidation &&
    Array.isArray(completionPlan) &&
    completionPlan.length >= 2 &&
    Number(runtimeProof?.summary?.failedSteps || 0) === 0;

  const ok = apiWired && smoke.ok && proofOk;
  return result(
    "Validate-Botomatic-DirtyRepoRescueReadiness",
    ok,
    ok
      ? "Dirty-repo intake/audit/repair/completion flow is present and wired into API/operator path."
      : "Dirty-repo flow is partially wired (missing API integration or validator smoke failed).",
    checks
  );
}
