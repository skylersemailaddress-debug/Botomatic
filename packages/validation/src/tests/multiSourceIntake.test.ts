import assert from "assert";
import {
  routeIntakeInput,
} from "../../../../apps/orchestrator-api/src/intake/intakeRouter";
import {
  classifyCloudProvider,
  intakeCloudLink,
  validateCloudLink,
} from "../../../../apps/orchestrator-api/src/intake/cloudIntake";
import { parseGitHubUrl } from "../../../../apps/orchestrator-api/src/intake/githubIntake";
import { validateLocalFolderManifest } from "../../../../apps/orchestrator-api/src/intake/localManifest";

function testRouterForGithub() {
  const route = routeIntakeInput({
    sourceType: "github_repo_url",
    sourceUri: "https://github.com/octocat/hello-world",
    maxUploadBytes: 250 * 1024 * 1024,
  });
  assert.strictEqual(route.accepted, true);
  assert.strictEqual(route.recommendedIntakePath, "remote_fetch");
}

function testRouterForCloudWithoutCredentials() {
  const route = routeIntakeInput({
    sourceType: "cloud_storage_link",
    sourceUri: "https://drive.google.com/file/d/123/view",
    maxUploadBytes: 250 * 1024 * 1024,
    hasConnectorCredentials: false,
  });
  assert.strictEqual(route.accepted, true);
  assert.strictEqual(route.recommendedIntakePath, "metadata_only");
  assert(route.requiredCredentials.includes("cloud_connector_access"));
}

function testCloudClassifier() {
  assert.strictEqual(classifyCloudProvider("https://drive.google.com/file/d/123/view"), "google_drive");
  assert.strictEqual(classifyCloudProvider("https://dropbox.com/s/abc123/file.zip"), "dropbox");
  assert.strictEqual(classifyCloudProvider("https://example.com/archive.zip"), "https_download");
}

function testCloudValidationAndDecision() {
  const valid = validateCloudLink("https://example.com/spec.zip");
  assert.strictEqual(valid.protocol, "https:");

  const metadataOnly = intakeCloudLink({
    sourceUrl: "https://drive.google.com/file/d/123/view",
    hasConnectorCredentials: false,
    estimatedSizeBytes: 120 * 1024 * 1024,
    largeDownloadApproval: false,
  });
  assert.strictEqual(metadataOnly.metadataOnly, true);
  assert.strictEqual(metadataOnly.authStatus, "missing");
}

function testGithubUrlParsing() {
  const repo = parseGitHubUrl("https://github.com/octocat/hello-world");
  assert.strictEqual(repo.kind, "repo");

  const branch = parseGitHubUrl("https://github.com/octocat/hello-world/tree/main");
  assert.strictEqual(branch.kind, "branch");
  assert.strictEqual(branch.branch, "main");

  const pr = parseGitHubUrl("https://github.com/octocat/hello-world/pull/42");
  assert.strictEqual(pr.kind, "pr");
  assert.strictEqual(pr.prNumber, 42);
}

function testLocalManifestValidation() {
  const manifest = validateLocalFolderManifest({
    sourceType: "local_folder_manifest",
    path: "./my-project",
    include: ["src/**"],
    exclude: ["node_modules/**"],
  });

  assert.strictEqual(manifest.sourceType, "local_folder_manifest");
  assert.strictEqual(manifest.include.length, 1);
  assert.strictEqual(manifest.exclude.length, 1);
}

function run() {
  testRouterForGithub();
  testRouterForCloudWithoutCredentials();
  testCloudClassifier();
  testCloudValidationAndDecision();
  testGithubUrlParsing();
  testLocalManifestValidation();
  console.log("multiSourceIntake.test.ts passed");
}

run();
