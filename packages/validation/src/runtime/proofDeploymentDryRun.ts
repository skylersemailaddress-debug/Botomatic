/**
 * Deployment Dry-Run Proof Harness
 *
 * For each required domain, performs structural dry-run validation:
 *  - validates deployment config files
 *  - generates preview artifacts where applicable
 *  - generates smoke-test plan
 *  - generates rollback plan
 *  - classifies credential requirements
 *  - records dryRunStatus and readinessStatus
 *
 * Does NOT perform live deployment, use real credentials, or call external APIs.
 * Evidence artifact: release-evidence/runtime/deployment_dry_run_proof.json
 */

import fs from "fs";
import path from "path";
import { spawnSync } from "child_process";
import { PROVIDER_DEPLOYMENT_REQUIREMENTS, type DeploymentProviderId, type ProviderHandoffCompleteness, type ProviderRollbackCompleteness } from "./deploymentProviderContracts";

type DomainId =
  | "web_saas_app"
  | "marketing_website"
  | "api_service"
  | "mobile_app"
  | "bot"
  | "ai_agent"
  | "game"
  | "dirty_repo_completion";

type CredentialClass =
  | "no_credentials_required"
  | "credentials_required_skipped"
  | "credentials_required_structural_only";

type DryRunStatus = "passed" | "skipped" | "failed";
type ReadinessStatus = "passed" | "passed_with_caveats" | "failed";

type DomainDryRunMatrix = {
  domainId: DomainId;
  emittedPath: string;
  deploymentTarget: string;
  dryRunMethod: string;
  dryRunCommand: string | null;
  deploymentConfigPaths: string[];
  previewArtifactPath: string | null;
  smokeTestPlanPath: string;
  rollbackPlanPath: string;
  credentialRequirementClassification: CredentialClass;
  liveDeploymentSkippedReason: string;
};

type DomainDryRunResult = {
  domainId: DomainId;
  emittedPath: string;
  deploymentTarget: string;
  dryRunMethod: string;
  dryRunCommand: string | null;
  deploymentConfigValidated: boolean;
  deploymentConfigMissing: string[];
  previewArtifactPath: string | null;
  previewArtifactGenerated: boolean;
  smokeTestPlanPath: string;
  rollbackPlanPath: string;
  credentialRequirementClassification: CredentialClass;
  liveDeploymentSkippedReason: string;
  dryRunStatus: DryRunStatus;
  dryRunSkipReason: string | null;
  readinessStatus: ReadinessStatus;
  readinessCaveat: string;
  providerHandoffCompleteness: ProviderHandoffCompleteness;
  providerRollbackCompleteness: ProviderRollbackCompleteness;
};

const ROOT = process.cwd();
const DRY_RUN_DIR = path.join(ROOT, "release-evidence", "runtime", "dry-run");
const PROOF_OUT = path.join(ROOT, "release-evidence", "runtime", "deployment_dry_run_proof.json");
const GEN_BASE = path.join(ROOT, "release-evidence", "generated-apps");
const DOMAIN_PROVIDER: Record<DomainId, DeploymentProviderId> = {
  web_saas_app: "vercel_web_deploy",
  marketing_website: "github_release_handoff",
  api_service: "supabase_backend_deploy",
  mobile_app: "mobile_store_handoff",
  bot: "bot_platform_deploy",
  ai_agent: "ai_agent_runtime_deploy",
  game: "game_distribution_handoff",
  dirty_repo_completion: "dirty_repo_completion_handoff",
};

function ensureDir(p: string) {
  fs.mkdirSync(p, { recursive: true });
}

function writeJson(p: string, data: unknown) {
  ensureDir(path.dirname(p));
  fs.writeFileSync(p, JSON.stringify(data, null, 2), "utf8");
}

function writeMd(p: string, content: string) {
  ensureDir(path.dirname(p));
  fs.writeFileSync(p, content, "utf8");
}

function exists(base: string, rel: string): boolean {
  return fs.existsSync(path.join(base, rel));
}

function listFiles(dir: string): string[] {
  if (!fs.existsSync(dir)) return [];
  const results: string[] = [];
  function walk(d: string) {
    for (const entry of fs.readdirSync(d)) {
      const full = path.join(d, entry);
      if (fs.statSync(full).isDirectory()) walk(full);
      else results.push(path.relative(dir, full));
    }
  }
  walk(dir);
  return results;
}

// ---------------------------------------------------------------------------
// Smoke-test and rollback plan generators
// ---------------------------------------------------------------------------

function generateSmokeTestPlan(domainId: string, deploymentTarget: string, domainDir: string): string {
  const planDir = path.join(DRY_RUN_DIR, domainId);
  const planPath = path.join(planDir, "smoke_test_plan.json");

  const smokeTests: Record<string, unknown[]> = {
    web_saas_app: [
      { step: 1, test: "GET / returns HTTP 200", assertion: "status === 200" },
      { step: 2, test: "Auth login page loads without error", assertion: "no JS console errors" },
      { step: 3, test: "API health endpoint responds", assertion: "/api/health returns { status: 'ok' }" },
      { step: 4, test: "Database migration ran successfully", assertion: "schema version matches expected" },
    ],
    marketing_website: [
      { step: 1, test: "GET / returns HTTP 200", assertion: "status === 200" },
      { step: 2, test: "Lead capture form submits without error", assertion: "form POST returns 2xx" },
      { step: 3, test: "SEO meta tags present on homepage", assertion: "og:title and description present" },
    ],
    api_service: [
      { step: 1, test: "GET /health returns { status: 'ok' }", assertion: "status === 200" },
      { step: 2, test: "Authenticated endpoint rejects unauthenticated request", assertion: "status === 401" },
      { step: 3, test: "Database ping succeeds", assertion: "no connection error" },
      { step: 4, test: "Container readiness probe passes", assertion: "readiness endpoint returns 200" },
    ],
    mobile_app: [
      { step: 1, test: "App launches without crash", assertion: "no fatal crash on startup" },
      { step: 2, test: "API backend reachable from app", assertion: "network request succeeds" },
      { step: 3, test: "Auth flow completes", assertion: "user lands on main screen after login" },
    ],
    bot: [
      { step: 1, test: "Webhook endpoint returns 200 on ping", assertion: "platform ping returns 200" },
      { step: 2, test: "Bot responds to health command", assertion: "bot replies within 5s" },
      { step: 3, test: "Webhook signature validation passes", assertion: "HMAC check passes for test payload" },
    ],
    ai_agent: [
      { step: 1, test: "Agent runtime health check passes", assertion: "GET /health returns 200" },
      { step: 2, test: "LLM provider connectivity confirmed", assertion: "test prompt returns non-error response" },
      { step: 3, test: "Tool invocation pipeline functional", assertion: "tool call returns structured result" },
    ],
    game: [
      { step: 1, test: "Game build artifact is complete", assertion: "all required output files present" },
      { step: 2, test: "Platform validation report passes", assertion: "no blocking issues in distribution check" },
      { step: 3, test: "Content policy check passes", assertion: "no flagged content in submission" },
    ],
    dirty_repo_completion: [
      { step: 1, test: "Repaired workflows test suite passes", assertion: "0 test failures" },
      { step: 2, test: "CI pipeline reaches green state", assertion: "all CI checks pass" },
      { step: 3, test: "No regression in existing tests", assertion: "prior passing tests remain passing" },
    ],
  };

  const plan = {
    domainId,
    deploymentTarget,
    generatedAt: new Date().toISOString(),
    note: "Smoke-test plan generated by deployment dry-run proof harness. Tests must be executed post-deployment against live environment.",
    smokeTests: smokeTests[domainId] ?? [],
  };

  writeJson(planPath, plan);
  return planPath;
}

function generateRollbackPlan(domainId: string, deploymentTarget: string): string {
  const planDir = path.join(DRY_RUN_DIR, domainId);
  const planPath = path.join(planDir, "rollback_plan.json");

  const rollbackStrategies: Record<string, unknown> = {
    web_saas_app: {
      strategy: "vercel_rollback",
      steps: [
        "Identify last known-good deployment in Vercel dashboard.",
        "Run `vercel rollback <deployment-url>` or use Vercel dashboard instant rollback.",
        "Verify database migration is backward-compatible or run rollback migration.",
        "Confirm DNS propagation and run smoke tests against rolled-back deployment.",
      ],
      estimatedDuration: "5–15 minutes",
      databaseRollback: "Apply down-migration matching the rolled-back schema version.",
    },
    marketing_website: {
      strategy: "static_hosting_rollback",
      steps: [
        "Identify prior deployment artifact in hosting provider.",
        "Re-deploy prior artifact via hosting provider rollback or re-upload.",
        "Verify lead webhook integration still functional.",
        "Confirm CDN cache purged and site loads prior version.",
      ],
      estimatedDuration: "5–10 minutes",
    },
    api_service: {
      strategy: "container_rollback",
      steps: [
        "Repoint container service to prior image tag.",
        "Drain connections and restart containers.",
        "Run schema rollback migration if schema changed.",
        "Verify /health endpoint returns 200 on prior image.",
      ],
      estimatedDuration: "5–20 minutes",
      databaseRollback: "Apply down-migration or restore from pre-migration snapshot.",
    },
    mobile_app: {
      strategy: "store_rollback",
      steps: [
        "Remove the new submission from store review queue if not yet approved.",
        "If live: use phased rollout controls to reduce exposure.",
        "For iOS: expedited app removal or urgent review request.",
        "Force users to prior version via minimum-version enforcement if critical.",
      ],
      estimatedDuration: "Hours to days (store-dependent)",
      note: "App store rollbacks are slow. Use feature flags and phased rollouts to mitigate risk.",
    },
    bot: {
      strategy: "worker_rollback",
      steps: [
        "Redeploy prior worker image or stop new worker and restart prior.",
        "Re-register webhook if endpoint changed.",
        "Verify platform ping returns 200 on prior worker.",
        "Monitor for message processing errors.",
      ],
      estimatedDuration: "5–10 minutes",
    },
    ai_agent: {
      strategy: "agent_runtime_rollback",
      steps: [
        "Repoint agent runtime to prior image or revision.",
        "Restore prior prompt templates and tool configurations.",
        "Flush evaluation pipeline and re-run sanity eval.",
        "Confirm LLM provider connectivity and latency normal.",
      ],
      estimatedDuration: "5–15 minutes",
    },
    game: {
      strategy: "distribution_platform_rollback",
      steps: [
        "Use platform rollback controls (Steam: push prior depot, Roblox: revert to prior published place).",
        "Notify players of revert via in-game or store announcement.",
        "Verify prior build loads without errors.",
      ],
      estimatedDuration: "15–60 minutes (platform-dependent)",
    },
    dirty_repo_completion: {
      strategy: "git_revert",
      steps: [
        "Identify commit range for completion changes.",
        "Run `git revert <commit-range>` to create revert commit.",
        "Push revert branch and raise PR for review.",
        "Verify CI passes on revert branch before merging.",
      ],
      estimatedDuration: "15–30 minutes",
    },
  };

  const plan = {
    domainId,
    deploymentTarget,
    generatedAt: new Date().toISOString(),
    note: "Rollback plan generated by deployment dry-run proof harness. Steps assume production environment access and standard toolchain.",
    rollback: rollbackStrategies[domainId] ?? { strategy: "manual_review", steps: [] },
  };

  writeJson(planPath, plan);
  return planPath;
}

function generatePreviewArtifact(domainId: DomainId, emittedPath: string): string | null {
  const domainDir = path.join(DRY_RUN_DIR, domainId);

  // Mobile and game require signing/platform tooling — no local preview artifact
  if (domainId === "mobile_app" || domainId === "game") return null;

  const artifactPath = path.join(domainDir, "preview_manifest.json");
  const files = listFiles(emittedPath);

  const preview = {
    domainId,
    generatedAt: new Date().toISOString(),
    emittedPath,
    emittedFileCount: files.length,
    emittedFiles: files.slice(0, 100), // cap for readability
    note: "Preview manifest lists emitted source files. Actual preview rendering requires deployment to a preview environment.",
    previewEnvironmentTarget:
      domainId === "web_saas_app"
        ? "Vercel Preview URL (requires Vercel account)"
        : domainId === "marketing_website"
        ? "Static hosting preview (requires hosting account)"
        : domainId === "api_service"
        ? "Container preview environment (requires registry + runtime)"
        : domainId === "bot"
        ? "Bot platform sandbox (requires platform account)"
        : domainId === "ai_agent"
        ? "Agent runtime sandbox (requires LLM credentials)"
        : "CI/CD preview pipeline",
  };

  writeJson(artifactPath, preview);
  return artifactPath;
}

// ---------------------------------------------------------------------------
// Per-domain matrix
// ---------------------------------------------------------------------------

function buildMatrix(): DomainDryRunMatrix[] {
  const base = GEN_BASE;
  return [
    {
      domainId: "web_saas_app",
      emittedPath: path.join(base, "web_saas_app"),
      deploymentTarget: "vercel",
      dryRunMethod: "structural_validation",
      dryRunCommand: null,
      deploymentConfigPaths: ["deploy/vercel.json", ".env.example", "integrations/integration_contract.json", "deploy/deployment_readiness.json"],
      previewArtifactPath: null, // generated below
      smokeTestPlanPath: "",
      rollbackPlanPath: "",
      credentialRequirementClassification: "credentials_required_skipped",
      liveDeploymentSkippedReason: "Live Vercel deployment requires account credentials and production database URL. Structural dry-run validates deployment config, env manifest, and integration contracts.",
    },
    {
      domainId: "marketing_website",
      emittedPath: path.join(base, "marketing_website"),
      deploymentTarget: "static_hosting",
      dryRunMethod: "structural_validation",
      dryRunCommand: null,
      deploymentConfigPaths: ["deploy/static-hosting.md", ".env.example", "integrations/integration_contract.json", "deploy/deployment_readiness.json"],
      previewArtifactPath: null,
      smokeTestPlanPath: "",
      rollbackPlanPath: "",
      credentialRequirementClassification: "credentials_required_skipped",
      liveDeploymentSkippedReason: "Live static hosting deployment requires account credentials. Structural dry-run validates config and integration contracts.",
    },
    {
      domainId: "api_service",
      emittedPath: path.join(base, "api_service"),
      deploymentTarget: "container_runtime",
      dryRunMethod: "structural_validation",
      dryRunCommand: null,
      deploymentConfigPaths: ["deploy/container.md", "deploy/Dockerfile", ".env.example", "integrations/integration_contract.json", "deploy/deployment_readiness.json"],
      previewArtifactPath: null,
      smokeTestPlanPath: "",
      rollbackPlanPath: "",
      credentialRequirementClassification: "credentials_required_skipped",
      liveDeploymentSkippedReason: "Live container deployment requires container registry credentials and runtime cluster access. Structural dry-run validates Dockerfile and deployment manifests.",
    },
    {
      domainId: "mobile_app",
      emittedPath: path.join(base, "mobile_app"),
      deploymentTarget: "ios_android_app_stores",
      dryRunMethod: "structural_validation",
      dryRunCommand: null,
      deploymentConfigPaths: ["deploy/app-store.md", "app.config.json", "integrations/integration_contract.json", "deploy/deployment_readiness.json"],
      previewArtifactPath: null,
      smokeTestPlanPath: "",
      rollbackPlanPath: "",
      credentialRequirementClassification: "credentials_required_skipped",
      liveDeploymentSkippedReason: "App store submission requires developer account login, code signing certificates, and release approval. No local preview possible without signing infrastructure.",
    },
    {
      domainId: "bot",
      emittedPath: path.join(base, "bot"),
      deploymentTarget: "worker_runtime",
      dryRunMethod: "structural_validation",
      dryRunCommand: null,
      deploymentConfigPaths: ["deploy/worker.md", ".env.example", "integrations/integration_contract.json", "deploy/deployment_readiness.json"],
      previewArtifactPath: null,
      smokeTestPlanPath: "",
      rollbackPlanPath: "",
      credentialRequirementClassification: "credentials_required_skipped",
      liveDeploymentSkippedReason: "Bot deployment requires platform bot token and webhook endpoint registration. Structural dry-run validates worker deployment config and integration contracts.",
    },
    {
      domainId: "ai_agent",
      emittedPath: path.join(base, "ai_agent"),
      deploymentTarget: "agent_runtime",
      dryRunMethod: "structural_validation",
      dryRunCommand: null,
      deploymentConfigPaths: ["deploy/agent-runtime.md", ".env.example", "integrations/integration_contract.json", "deploy/deployment_readiness.json"],
      previewArtifactPath: null,
      smokeTestPlanPath: "",
      rollbackPlanPath: "",
      credentialRequirementClassification: "credentials_required_skipped",
      liveDeploymentSkippedReason: "Agent runtime deployment requires LLM API credentials and model access policy approvals. No safe local LLM execution without real API keys.",
    },
    {
      domainId: "game",
      emittedPath: path.join(base, "game"),
      deploymentTarget: "game_distribution_platform",
      dryRunMethod: "structural_validation",
      dryRunCommand: null,
      deploymentConfigPaths: ["export/build-notes.md", "integrations/integration_contract.json", "deploy/deployment_readiness.json"],
      previewArtifactPath: null,
      smokeTestPlanPath: "",
      rollbackPlanPath: "",
      credentialRequirementClassification: "credentials_required_skipped",
      liveDeploymentSkippedReason: "Game distribution requires publisher account credentials, platform signing, and compliance submission. Structural dry-run validates build notes and distribution config.",
    },
    {
      domainId: "dirty_repo_completion",
      emittedPath: path.join(base, "dirty_repo_completion"),
      deploymentTarget: "existing_repo_hosting",
      dryRunMethod: "structural_validation",
      dryRunCommand: null,
      deploymentConfigPaths: ["launch/launch_instructions.md", "integrations/integration_contract.json", "launch/deployment_readiness.json"],
      previewArtifactPath: null,
      smokeTestPlanPath: "",
      rollbackPlanPath: "",
      credentialRequirementClassification: "credentials_required_skipped",
      liveDeploymentSkippedReason: "Repository completion rollout requires git hosting credentials and CI pipeline permissions. Structural dry-run validates launch instructions and workflow configs.",
    },
  ];
}

// ---------------------------------------------------------------------------
// Per-domain runner
// ---------------------------------------------------------------------------

function runDomain(matrix: DomainDryRunMatrix): DomainDryRunResult {
  const { domainId, emittedPath, deploymentConfigPaths, deploymentTarget, dryRunMethod, dryRunCommand, credentialRequirementClassification, liveDeploymentSkippedReason } = matrix;

  const domainDir = path.join(DRY_RUN_DIR, domainId);
  ensureDir(domainDir);

  // Validate deployment config files exist
  const missing = deploymentConfigPaths.filter((rel) => !exists(emittedPath, rel));
  const deploymentConfigValidated = missing.length === 0;

  // Generate preview artifact
  const previewArtifactPath = generatePreviewArtifact(domainId, emittedPath);
  const previewArtifactGenerated = previewArtifactPath !== null && fs.existsSync(previewArtifactPath);

  // Generate smoke-test plan
  const smokeTestPlanPath = generateSmokeTestPlan(domainId, deploymentTarget, domainDir);

  // Generate rollback plan
  const rollbackPlanPath = generateRollbackPlan(domainId, deploymentTarget);

  // Determine dry-run status
  // We perform structural validation — if all deployment config files exist, dry-run passes.
  // For credentials_required_skipped, live execution is skipped; structural still validates.
  let dryRunStatus: DryRunStatus = "passed";
  let dryRunSkipReason: string | null = null;

  if (!deploymentConfigValidated) {
    dryRunStatus = "failed";
  }

  const readinessStatus: ReadinessStatus = dryRunStatus === "passed" ? "passed_with_caveats" : "failed";
  const readinessCaveat =
    "Dry-run readiness is based on structural validation of deployment configs, preview manifest generation, smoke-test plan generation, and rollback plan generation. Live deployment and credential-authenticated preview environment validation are not performed.";

  const providerId = DOMAIN_PROVIDER[domainId];
  const providerRequirement = PROVIDER_DEPLOYMENT_REQUIREMENTS[providerId];
  return {
    domainId,
    emittedPath,
    deploymentTarget,
    dryRunMethod,
    dryRunCommand,
    deploymentConfigValidated,
    deploymentConfigMissing: missing,
    previewArtifactPath: previewArtifactPath ?? null,
    previewArtifactGenerated,
    smokeTestPlanPath,
    rollbackPlanPath,
    credentialRequirementClassification,
    liveDeploymentSkippedReason,
    dryRunStatus,
    dryRunSkipReason,
    readinessStatus,
    readinessCaveat,
    providerHandoffCompleteness: {
      providerId,
      environment: "prod",
      requiredSecretsReferenced: providerRequirement.requiredSecretsReferenced,
      buildCommandKnown: providerRequirement.buildCommandKnown,
      outputDirectoryKnown: providerRequirement.outputDirectoryKnown,
      deployCommandTemplatePresent: providerRequirement.deployCommandTemplatePresent,
      healthCheckPathKnown: providerRequirement.healthCheckPathKnown,
      smokePlanPresent: providerRequirement.smokePlanPresent,
      rollbackPlanPresent: providerRequirement.rollbackPlanPresent,
      approvalRequired: true,
      status: "blocked",
    },
    providerRollbackCompleteness: {
      providerId,
      environment: "prod",
      rollbackStrategy: providerRequirement.rollbackStrategy,
      rollbackCommandTemplatePresent: providerRequirement.rollbackPlanPresent,
      previousVersionReferenceRequired: true,
      dataRollbackBoundaryDocumented: true,
      approvalRequired: true,
      status: "blocked",
    },
  };
}

// ---------------------------------------------------------------------------
// Main
// ---------------------------------------------------------------------------

function main() {
  ensureDir(DRY_RUN_DIR);
  ensureDir(path.join(ROOT, "release-evidence", "runtime"));

  const matrix = buildMatrix();
  const domainResults: DomainDryRunResult[] = [];
  const failedDomains: string[] = [];

  for (const entry of matrix) {
    const result = runDomain(entry);
    domainResults.push(result);
    if (result.dryRunStatus === "failed") {
      failedDomains.push(entry.domainId);
      console.error(`[FAIL] ${entry.domainId}: deploymentConfigMissing=${JSON.stringify(result.deploymentConfigMissing)}`);
    } else {
      console.log(`[OK] ${entry.domainId}: dryRunStatus=${result.dryRunStatus} readinessStatus=${result.readinessStatus}`);
    }
  }

  const allPassed = failedDomains.length === 0;
  const status = allPassed ? "passed" : "failed";

  const proof = {
    pathId: "deployment_dry_run",
    status,
    generatedAt: new Date().toISOString(),
    domainCount: domainResults.length,
    failedDomainCount: failedDomains.length,
    failedDomains,
    requiredDomainPresence: matrix.length === 8 && domainResults.length === 8,
    caveat: "Deployment dry-run proof validates deployment configuration presence, preview artifact generation, smoke-test plan generation, and rollback plan generation. It does not perform live deployment, use real credentials, or call external production APIs. This is not a substitute for production smoke testing.",
    domainResults,
  };

  writeJson(PROOF_OUT, proof);

  const status_line = `status=${status} domainCount=${domainResults.length} failedDomainCount=${failedDomains.length}`;
  console.log(status_line);

  if (!allPassed) process.exit(1);
}

main();
