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
    name: "Validate-Botomatic-MultiSourceIntakeReadiness",
    status: ok ? "passed" : "failed",
    summary,
    checks,
  };
}

export function validateMultiSourceIntakeReadiness(root: string): RepoValidatorResult {
  const checks = [
    "apps/orchestrator-api/src/intake/sourceModel.ts",
    "apps/orchestrator-api/src/intake/intakeRouter.ts",
    "apps/orchestrator-api/src/intake/githubIntake.ts",
    "apps/orchestrator-api/src/intake/cloudIntake.ts",
    "apps/orchestrator-api/src/intake/localManifest.ts",
    "apps/orchestrator-api/src/intake/manifestWriter.ts",
    "apps/control-plane/src/components/overview/IntakeHubPanel.tsx",
    "apps/control-plane/src/services/intakeSources.ts",
    "apps/orchestrator-api/src/server_app.ts",
    "release-evidence/runtime/multi_source_intake_readiness_proof.json",
  ];

  if (!checks.every((rel) => has(root, rel))) {
    return result(false, "Multi-source intake readiness files are missing.", checks);
  }

  const server = read(root, "apps/orchestrator-api/src/server_app.ts");
  const router = read(root, "apps/orchestrator-api/src/intake/intakeRouter.ts");
  const sourceModel = read(root, "apps/orchestrator-api/src/intake/sourceModel.ts");
  const intakeHub = read(root, "apps/control-plane/src/components/overview/IntakeHubPanel.tsx");
  const intakeServices = read(root, "apps/control-plane/src/services/intakeSources.ts");

  const requiredRoutes = [
    "/api/projects/:projectId/intake/sources",
    "/api/projects/:projectId/intake/source",
    "/api/projects/:projectId/intake/pasted-text",
    "/api/projects/:projectId/intake/github",
    "/api/projects/:projectId/intake/cloud-link",
    "/api/projects/:projectId/intake/local-manifest",
  ];

  const requiredEvents = [
    "intake_source_registered",
    "intake_route_selected",
    "intake_manifest_written",
    "intake_completed",
    "intake_blocked_requires_auth",
    "remote_fetch_started",
    "repo_scan_started",
    "secret_scan_started",
    "framework_detection_started",
  ];

  const hasRoutes = requiredRoutes.every((route) => server.includes(route));
  if (!hasRoutes) {
    return result(false, "Required multi-source intake API routes are missing.", checks);
  }

  const hasEvents = requiredEvents.every((eventName) => server.includes(eventName));
  if (!hasEvents) {
    return result(false, "Required multi-source intake lifecycle events are missing.", checks);
  }

  const sourceModelCoversRequiredTypes = [
    "pasted_text",
    "uploaded_zip",
    "uploaded_pdf",
    "github_repo_url",
    "github_branch_url",
    "github_pr_url",
    "cloud_storage_link",
    "local_folder_manifest",
    "existing_project_reference",
  ].every((token) => sourceModel.includes(token));

  if (!sourceModelCoversRequiredTypes) {
    return result(false, "IntakeSource model is missing one or more required source types.", checks);
  }

  const routerCoverage = [
    "cloud_storage_link",
    "github_repo_url",
    "github_branch_url",
    "github_pr_url",
    "local_folder_manifest",
    "pasted_text",
    "streaming_upload",
    "metadata_only",
    "connector_fetch",
  ].every((token) => router.includes(token));

  if (!routerCoverage) {
    return result(false, "Intake router does not cover required source routing branches.", checks);
  }

  const uiCoverage =
    intakeHub.includes("Intake Hub") &&
    intakeHub.includes("Intake from GitHub") &&
    intakeHub.includes("Register cloud link") &&
    intakeHub.includes("Ingest pasted text") &&
    intakeHub.includes("Register local manifest") &&
    intakeHub.includes("Register existing project");

  const serviceCoverage =
    intakeServices.includes("/intake/source") &&
    intakeServices.includes("/intake/sources") &&
    intakeServices.includes("/intake/pasted-text") &&
    intakeServices.includes("/intake/github") &&
    intakeServices.includes("/intake/cloud-link") &&
    intakeServices.includes("/intake/local-manifest");

  if (!uiCoverage || !serviceCoverage) {
    return result(false, "Control-plane Intake Hub or intake source API services are incomplete.", checks);
  }

  let proof: any;
  try {
    proof = JSON.parse(read(root, "release-evidence/runtime/multi_source_intake_readiness_proof.json"));
  } catch {
    return result(false, "Multi-source intake proof artifact is missing or invalid JSON.", checks);
  }

  const proofOk =
    proof?.status === "passed" &&
    proof?.routesPresent === true &&
    proof?.sourceModelPresent === true &&
    proof?.routerCoveragePresent === true &&
    proof?.githubAdapterPresent === true &&
    proof?.cloudAdapterPresent === true &&
    proof?.localManifestValidationPresent === true &&
    proof?.perSourceManifestWritingPresent === true &&
    proof?.intakeHubUiPresent === true &&
    proof?.eventsPresent === true &&
    proof?.noCodeExecutionDuringIntakeDeclared === true;

  if (!proofOk) {
    return result(false, "Multi-source intake proof artifact fields are fail-closed or incomplete.", checks);
  }

  return result(
    true,
    "Multi-source intake readiness is validated across API routes, source model/router, adapters, Intake Hub UI, lifecycle events, and proof artifact coverage.",
    checks
  );
}
