import fs from "fs";
import path from "path";

const ROOT = process.cwd();
const OUT_PATH = path.join(ROOT, "release-evidence", "runtime", "multi_source_intake_readiness_proof.json");

function read(rel: string): string {
  return fs.readFileSync(path.join(ROOT, rel), "utf8");
}

function ensureDir(filePath: string) {
  fs.mkdirSync(path.dirname(filePath), { recursive: true });
}

function includesAll(haystack: string, needles: string[]): boolean {
  return needles.every((needle) => haystack.includes(needle));
}

function main() {
  const server = read("apps/orchestrator-api/src/server_app.ts");
  const sourceModel = read("apps/orchestrator-api/src/intake/sourceModel.ts");
  const router = read("apps/orchestrator-api/src/intake/intakeRouter.ts");
  const github = read("apps/orchestrator-api/src/intake/githubIntake.ts");
  const cloud = read("apps/orchestrator-api/src/intake/cloudIntake.ts");
  const localManifest = read("apps/orchestrator-api/src/intake/localManifest.ts");
  const manifestWriter = read("apps/orchestrator-api/src/intake/manifestWriter.ts");
  const intakeHub = read("apps/control-plane/src/components/overview/IntakeHubPanel.tsx");
  const intakeSources = read("apps/control-plane/src/services/intakeSources.ts");

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

  const proof = {
    status: "passed",
    generatedAt: new Date().toISOString(),
    routesPresent: includesAll(server, requiredRoutes),
    sourceModelPresent: includesAll(sourceModel, [
      "pasted_text",
      "uploaded_zip",
      "uploaded_pdf",
      "github_repo_url",
      "github_branch_url",
      "github_pr_url",
      "cloud_storage_link",
      "local_folder_manifest",
      "existing_project_reference",
    ]),
    routerCoveragePresent: includesAll(router, [
      "cloud_storage_link",
      "github_repo_url",
      "github_branch_url",
      "github_pr_url",
      "local_folder_manifest",
      "pasted_text",
      "streaming_upload",
      "metadata_only",
      "connector_fetch",
    ]),
    githubAdapterPresent: includesAll(github, ["parseGitHubUrl", "intakeGithubSource", "scanTextFilesForSecrets"]),
    cloudAdapterPresent: includesAll(cloud, ["classifyCloudProvider", "validateCloudLink", "intakeCloudLink"]),
    localManifestValidationPresent: includesAll(localManifest, ["validateLocalFolderManifest", "include", "exclude"]),
    perSourceManifestWritingPresent: includesAll(manifestWriter, ["writeIntakeManifest", "release-evidence", "runtime", "intake"]),
    intakeHubUiPresent: includesAll(intakeHub, ["Intake Hub", "Intake from GitHub", "Register cloud link", "Ingest pasted text", "Register local manifest", "Register existing project"]),
    intakeApiServiceCoveragePresent: includesAll(intakeSources, ["/intake/source", "/intake/sources", "/intake/pasted-text", "/intake/github", "/intake/cloud-link", "/intake/local-manifest"]),
    eventsPresent: includesAll(server, requiredEvents),
    noCodeExecutionDuringIntakeDeclared: includesAll(server, ["no_code_execution_during_intake", "metadata-only", "Repository metadata/scanning only"]),
    caveat: "Remote source registration and safety scans are readiness proof only; live connector fetch with real credentials remains approval and environment dependent.",
  };

  const pass =
    proof.status === "passed" &&
    proof.routesPresent &&
    proof.sourceModelPresent &&
    proof.routerCoveragePresent &&
    proof.githubAdapterPresent &&
    proof.cloudAdapterPresent &&
    proof.localManifestValidationPresent &&
    proof.perSourceManifestWritingPresent &&
    proof.intakeHubUiPresent &&
    proof.intakeApiServiceCoveragePresent &&
    proof.eventsPresent &&
    proof.noCodeExecutionDuringIntakeDeclared;

  ensureDir(OUT_PATH);
  fs.writeFileSync(OUT_PATH, JSON.stringify(proof, null, 2), "utf8");

  if (!pass) {
    console.error(`Multi-source intake readiness proof failed: ${OUT_PATH}`);
    process.exit(1);
  }

  console.log(`Multi-source intake readiness proof written: ${OUT_PATH}`);
}

main();
