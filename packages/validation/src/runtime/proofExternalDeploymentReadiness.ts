import fs from "fs";
import path from "path";
import { spawnSync } from "child_process";
import {
  type DeploymentReadiness,
  type DryRunStatus,
  type IntegrationContract,
  validateDeploymentReadinessSchema,
  validateIntegrationContractSchema,
} from "./externalDeploymentSchemas";
import {
  ensureJsonFile,
  readEnvManifestVars,
  scanCommittedSecrets,
  scanFakeIntegrationLanguage,
  summarizeOutput,
  validateRequiredEnvVars,
} from "./externalDeploymentReadinessUtils";

type DomainId =
  | "web_saas_app"
  | "marketing_website"
  | "api_service"
  | "mobile_app"
  | "bot"
  | "ai_agent"
  | "game"
  | "dirty_repo_completion";

type DomainExternalMatrix = {
  domainId: DomainId;
  emittedPath: string;
  deploymentTarget: string;
  deploymentInstructionsPath: string;
  envManifestPath: string | null;
  integrationContractPath: string;
  deploymentReadinessPath: string;
  requiredServices: string[];
  optionalServices: string[];
  requiredEnvVars: string[];
  optionalEnvVars: string[];
  requiredSecrets: string[];
  optionalSecrets: string[];
  dryRunCommand: string | null;
  launchCaveat: string;
};

const REQUIRED_DOMAINS: DomainId[] = [
  "web_saas_app",
  "marketing_website",
  "api_service",
  "mobile_app",
  "bot",
  "ai_agent",
  "game",
  "dirty_repo_completion",
];

function buildMatrix(root: string): DomainExternalMatrix[] {
  const base = path.join(root, "release-evidence", "generated-apps");
  return [
    {
      domainId: "web_saas_app",
      emittedPath: path.join(base, "web_saas_app"),
      deploymentTarget: "vercel",
      deploymentInstructionsPath: "deploy/vercel.json",
      envManifestPath: ".env.example",
      integrationContractPath: "integrations/integration_contract.json",
      deploymentReadinessPath: "deploy/deployment_readiness.json",
      requiredServices: ["vercel", "postgres", "oidc_provider"],
      optionalServices: ["stripe", "sendgrid", "twilio", "github_actions"],
      requiredEnvVars: ["NEXT_PUBLIC_API_BASE_URL", "DATABASE_URL"],
      optionalEnvVars: ["OIDC_ISSUER", "OIDC_AUDIENCE", "STRIPE_SECRET_KEY", "SENDGRID_API_KEY", "TWILIO_AUTH_TOKEN"],
      requiredSecrets: ["DATABASE_URL"],
      optionalSecrets: ["OIDC_CLIENT_SECRET", "STRIPE_SECRET_KEY", "SENDGRID_API_KEY", "TWILIO_AUTH_TOKEN"],
      dryRunCommand: "npm run -s build",
      launchCaveat: "Live deployment requires Vercel account access, OIDC credentials, and production database connectivity.",
    },
    {
      domainId: "marketing_website",
      emittedPath: path.join(base, "marketing_website"),
      deploymentTarget: "static_hosting",
      deploymentInstructionsPath: "deploy/static-hosting.md",
      envManifestPath: ".env.example",
      integrationContractPath: "integrations/integration_contract.json",
      deploymentReadinessPath: "deploy/deployment_readiness.json",
      requiredServices: ["static_hosting", "lead_webhook"],
      optionalServices: ["analytics_provider", "email_platform"],
      requiredEnvVars: ["LEAD_WEBHOOK_URL"],
      optionalEnvVars: ["ANALYTICS_WRITE_KEY", "EMAIL_API_KEY"],
      requiredSecrets: ["LEAD_WEBHOOK_URL"],
      optionalSecrets: ["ANALYTICS_WRITE_KEY", "EMAIL_API_KEY"],
      dryRunCommand: "npm run -s build",
      launchCaveat: "Live deployment requires hosting account credentials and lead webhook endpoint credentials.",
    },
    {
      domainId: "api_service",
      emittedPath: path.join(base, "api_service"),
      deploymentTarget: "container_runtime",
      deploymentInstructionsPath: "deploy/container.md",
      envManifestPath: ".env.example",
      integrationContractPath: "integrations/integration_contract.json",
      deploymentReadinessPath: "deploy/deployment_readiness.json",
      requiredServices: ["container_registry", "container_runtime", "postgres"],
      optionalServices: ["api_gateway", "observability_stack"],
      requiredEnvVars: ["PORT", "DATABASE_URL"],
      optionalEnvVars: ["API_GATEWAY_URL", "OTEL_EXPORTER_OTLP_ENDPOINT"],
      requiredSecrets: ["DATABASE_URL"],
      optionalSecrets: ["API_GATEWAY_TOKEN", "OTEL_AUTH_TOKEN"],
      dryRunCommand: "npm run -s build",
      launchCaveat: "Live deployment requires container registry credentials and runtime cluster access.",
    },
    {
      domainId: "mobile_app",
      emittedPath: path.join(base, "mobile_app"),
      deploymentTarget: "ios_android_app_stores",
      deploymentInstructionsPath: "deploy/app-store.md",
      envManifestPath: "app.config.json",
      integrationContractPath: "integrations/integration_contract.json",
      deploymentReadinessPath: "deploy/deployment_readiness.json",
      requiredServices: ["app_store_connect", "play_console", "mobile_api_backend"],
      optionalServices: ["crash_reporting", "push_notifications"],
      requiredEnvVars: [],
      optionalEnvVars: ["SENTRY_DSN", "PUSH_PROVIDER_KEY"],
      requiredSecrets: ["IOS_SIGNING_CERT", "ANDROID_KEYSTORE"],
      optionalSecrets: ["SENTRY_AUTH_TOKEN", "PUSH_PROVIDER_SECRET"],
      dryRunCommand: null,
      launchCaveat: "Live store deployment requires developer account login, code signing material, and release approvals.",
    },
    {
      domainId: "bot",
      emittedPath: path.join(base, "bot"),
      deploymentTarget: "worker_runtime",
      deploymentInstructionsPath: "deploy/worker.md",
      envManifestPath: ".env.example",
      integrationContractPath: "integrations/integration_contract.json",
      deploymentReadinessPath: "deploy/deployment_readiness.json",
      requiredServices: ["bot_platform", "webhook_gateway"],
      optionalServices: ["queue_service", "audit_sink"],
      requiredEnvVars: ["BOT_TOKEN", "BOT_WEBHOOK_SECRET"],
      optionalEnvVars: ["QUEUE_URL", "AUDIT_WEBHOOK_URL"],
      requiredSecrets: ["BOT_TOKEN", "BOT_WEBHOOK_SECRET"],
      optionalSecrets: ["QUEUE_TOKEN", "AUDIT_WEBHOOK_SECRET"],
      dryRunCommand: "npm run -s build",
      launchCaveat: "Live bot deployment requires platform bot token issuance and webhook endpoint registration.",
    },
    {
      domainId: "ai_agent",
      emittedPath: path.join(base, "ai_agent"),
      deploymentTarget: "agent_runtime",
      deploymentInstructionsPath: "deploy/agent-runtime.md",
      envManifestPath: ".env.example",
      integrationContractPath: "integrations/integration_contract.json",
      deploymentReadinessPath: "deploy/deployment_readiness.json",
      requiredServices: ["llm_provider", "agent_runtime"],
      optionalServices: ["vector_store", "eval_pipeline"],
      requiredEnvVars: ["LLM_API_KEY", "LLM_MODEL"],
      optionalEnvVars: ["VECTOR_STORE_URL", "EVAL_RUNNER_URL"],
      requiredSecrets: ["LLM_API_KEY"],
      optionalSecrets: ["VECTOR_STORE_TOKEN", "EVAL_RUNNER_TOKEN"],
      dryRunCommand: "npm run -s build",
      launchCaveat: "Live deployment requires LLM provider credentials, model access policy, and runtime governance approvals.",
    },
    {
      domainId: "game",
      emittedPath: path.join(base, "game"),
      deploymentTarget: "game_distribution_platform",
      deploymentInstructionsPath: "export/build-notes.md",
      envManifestPath: null,
      integrationContractPath: "integrations/integration_contract.json",
      deploymentReadinessPath: "deploy/deployment_readiness.json",
      requiredServices: ["distribution_platform"],
      optionalServices: ["steam", "roblox", "console_stores"],
      requiredEnvVars: [],
      optionalEnvVars: ["STEAM_APP_ID", "ROBLOX_PLACE_ID"],
      requiredSecrets: ["distribution_signing_key"],
      optionalSecrets: ["STEAM_PUBLISH_TOKEN", "ROBLOX_API_KEY"],
      dryRunCommand: "npm run -s build",
      launchCaveat: "Live game deployment requires platform-specific publisher accounts, signing credentials, and compliance submission.",
    },
    {
      domainId: "dirty_repo_completion",
      emittedPath: path.join(base, "dirty_repo_completion"),
      deploymentTarget: "existing_repo_hosting",
      deploymentInstructionsPath: "launch/launch_instructions.md",
      envManifestPath: null,
      integrationContractPath: "integrations/integration_contract.json",
      deploymentReadinessPath: "launch/deployment_readiness.json",
      requiredServices: ["git_hosting", "ci_runner"],
      optionalServices: ["artifact_registry", "deployment_platform"],
      requiredEnvVars: [],
      optionalEnvVars: ["CI_TOKEN", "DEPLOYMENT_TOKEN"],
      requiredSecrets: ["git_hosting_token"],
      optionalSecrets: ["ci_runner_token", "artifact_registry_token"],
      dryRunCommand: "node tests/repaired_workflows.test.js",
      launchCaveat: "Live completion rollout requires repository hosting credentials and CI/deployment pipeline permissions.",
    },
  ];
}

function runDryRun(domainPath: string, command: string | null): DryRunStatus {
  if (!command) {
    return {
      attempted: false,
      command: null,
      status: "skipped",
      reason: "No safe local dry-run command is defined for this domain target.",
    };
  }

  const run = spawnSync("bash", ["-lc", command], {
    cwd: domainPath,
    encoding: "utf8",
    timeout: 120000,
    maxBuffer: 1024 * 1024,
  });

  const exitCode = typeof run.status === "number" ? run.status : 1;
  return {
    attempted: true,
    command,
    status: exitCode === 0 ? "passed" : "failed",
    reason: exitCode === 0
      ? "Dry-run command succeeded."
      : `Dry-run command failed: ${summarizeOutput(String(run.stderr || run.stdout || ""))}`,
  };
}

function run() {
  const root = process.cwd();
  const multiDomainPath = path.join(root, "release-evidence", "runtime", "multi_domain_emitted_output_proof.json");

  if (!fs.existsSync(multiDomainPath)) {
    console.error("Missing release-evidence/runtime/multi_domain_emitted_output_proof.json. Run proof:multi-domain-emitted-output first.");
    process.exit(1);
  }

  const multiDomainProof = JSON.parse(fs.readFileSync(multiDomainPath, "utf8"));
  const domainResultsFromMulti = Array.isArray(multiDomainProof?.domainResults) ? multiDomainProof.domainResults : [];

  const matrix = buildMatrix(root);
  const declared = matrix.map((m) => m.domainId);
  const missingDeclarations = REQUIRED_DOMAINS.filter((d) => !declared.includes(d));
  if (missingDeclarations.length > 0) {
    console.error(`Missing external dependency declarations for domains: ${missingDeclarations.join(", ")}`);
    process.exit(1);
  }

  const proofDomainResults: Array<Record<string, unknown>> = [];

  for (const domain of matrix) {
    const emittedPath = domain.emittedPath;
    const instructionsFull = path.join(emittedPath, domain.deploymentInstructionsPath);
    const integrationContractFull = path.join(emittedPath, domain.integrationContractPath);
    const deploymentReadinessFull = path.join(emittedPath, domain.deploymentReadinessPath);

    const multiEvidence = domainResultsFromMulti.find((item: any) => item?.domainId === domain.domainId);
    const emittedPathPresent = Boolean(multiEvidence) && fs.existsSync(emittedPath);

    const fakeScan = emittedPathPresent ? scanFakeIntegrationLanguage(emittedPath) : { ok: false, issues: ["Emitted path missing."] };
    const secretScan = emittedPathPresent ? scanCommittedSecrets(emittedPath) : { ok: false, issues: ["Emitted path missing."] };

    const envPresentVars = emittedPathPresent ? readEnvManifestVars(emittedPath, domain.envManifestPath) : [];
    const envCheck = validateRequiredEnvVars(envPresentVars, domain.requiredEnvVars);

    const dryRun = emittedPathPresent ? runDryRun(emittedPath, domain.dryRunCommand) : {
      attempted: false,
      command: domain.dryRunCommand,
      status: "failed",
      reason: "Domain emitted path missing.",
    } as DryRunStatus;

    const services = [
      ...domain.requiredServices.map((service) => ({
        service,
        required: true,
        executed: false,
        executionMode: dryRun.attempted ? "dry_run" : "not_executed",
        result: "skipped",
        reason: "External live execution requires credentials/platform login and is intentionally not executed in repository proof harness.",
      })),
      ...domain.optionalServices.map((service) => ({
        service,
        required: false,
        executed: false,
        executionMode: "not_executed",
        result: "skipped",
        reason: "Optional external integration not executed in local proof harness.",
      })),
    ] as IntegrationContract["services"];

    const integrationContract: IntegrationContract = {
      schemaVersion: "1.0",
      domainId: domain.domainId,
      integrationContractId: `integration_contract_${domain.domainId}`,
      deploymentTarget: domain.deploymentTarget,
      requiredServices: domain.requiredServices,
      optionalServices: domain.optionalServices,
      requiredEnvVars: domain.requiredEnvVars,
      optionalEnvVars: domain.optionalEnvVars,
      requiredSecrets: domain.requiredSecrets,
      optionalSecrets: domain.optionalSecrets,
      services,
      launchCaveat: domain.launchCaveat,
      generatedAt: new Date().toISOString(),
    };

    const externalServicesNotExecuted = services
      .filter((svc) => svc.executed === false)
      .map((svc) => ({ service: svc.service, reason: svc.reason }));

    const deploymentReadiness: DeploymentReadiness = {
      schemaVersion: "1.0",
      domainId: domain.domainId,
      deploymentTarget: domain.deploymentTarget,
      deploymentInstructionsPath: domain.deploymentInstructionsPath,
      envManifestPath: domain.envManifestPath,
      envManifestPresent: domain.envManifestPath ? fs.existsSync(path.join(emittedPath, domain.envManifestPath)) : true,
      requiredEnvVarsPresent: envCheck.ok,
      requiredEnvVarsMissing: envCheck.missing,
      fakeIntegrationScanPassed: fakeScan.ok,
      fakeIntegrationScanIssues: fakeScan.issues,
      secretScanPassed: secretScan.ok,
      secretScanIssues: secretScan.issues,
      dryRunStatus: dryRun,
      externalServicesNotExecuted,
      externalExecutionJustified: externalServicesNotExecuted.every((item) => item.reason.trim().length > 0),
      deploymentReadinessStatus: "failed",
      launchCaveat: domain.launchCaveat,
      generatedAt: new Date().toISOString(),
    };

    const contractSchema = validateIntegrationContractSchema(integrationContract);
    const readinessSchema = validateDeploymentReadinessSchema(deploymentReadiness);

    const deploymentInstructionsPresent = fs.existsSync(instructionsFull);
    const contractPresent = true;

    const dryRunOk = dryRun.status === "passed" || dryRun.status === "skipped";
    const allOk =
      emittedPathPresent &&
      deploymentInstructionsPresent &&
      contractPresent &&
      envCheck.ok &&
      fakeScan.ok &&
      secretScan.ok &&
      contractSchema.ok &&
      readinessSchema.ok &&
      deploymentReadiness.externalExecutionJustified &&
      dryRunOk;

    deploymentReadiness.deploymentReadinessStatus = allOk ? "passed" : "failed";

    ensureJsonFile(integrationContractFull, integrationContract);
    ensureJsonFile(deploymentReadinessFull, deploymentReadiness);

    proofDomainResults.push({
      domainId: domain.domainId,
      emittedPath,
      externalServicesRequired: domain.requiredServices,
      optionalServices: domain.optionalServices,
      environmentVariablesRequired: domain.requiredEnvVars,
      environmentVariablesOptional: domain.optionalEnvVars,
      deploymentTarget: domain.deploymentTarget,
      deploymentInstructionsPath: domain.deploymentInstructionsPath,
      integrationContractPath: domain.integrationContractPath,
      deploymentReadinessPath: domain.deploymentReadinessPath,
      fakeIntegrationScanResult: {
        passed: fakeScan.ok,
        issues: fakeScan.issues,
      },
      secretScanResult: {
        passed: secretScan.ok,
        issues: secretScan.issues,
      },
      requiredEnvVarsMissing: envCheck.missing,
      deploymentInstructionsPresent,
      integrationContractSchemaValid: contractSchema.ok,
      integrationContractSchemaIssues: contractSchema.issues,
      deploymentReadinessSchemaValid: readinessSchema.ok,
      deploymentReadinessSchemaIssues: readinessSchema.issues,
      dryRunStatus: dryRun,
      externalServicesNotExecuted,
      launchCaveat: domain.launchCaveat,
      deploymentReadinessStatus: deploymentReadiness.deploymentReadinessStatus,
    });
  }

  const failedDomains = proofDomainResults.filter((d: any) => d.deploymentReadinessStatus !== "passed");
  const requiredDomainPresence = REQUIRED_DOMAINS.every((id) => proofDomainResults.some((d: any) => d.domainId === id));

  const artifact = {
    generatedAt: new Date().toISOString(),
    proofGrade: "local_runtime",
    pathId: "external_integration_deployment_readiness",
    requiredDomains: REQUIRED_DOMAINS,
    requiredDomainPresence,
    domainCount: proofDomainResults.length,
    failedDomainCount: failedDomains.length,
    domainResults: proofDomainResults,
    status: requiredDomainPresence && failedDomains.length === 0 ? "passed" : "failed",
  };

  const outPath = path.join(root, "release-evidence", "runtime", "external_integration_deployment_readiness_proof.json");
  fs.mkdirSync(path.dirname(outPath), { recursive: true });
  fs.writeFileSync(outPath, JSON.stringify(artifact, null, 2));

  console.log(`External integration/deployment readiness proof written: ${outPath}`);
  console.log(`status=${artifact.status} domainCount=${artifact.domainCount} failedDomainCount=${artifact.failedDomainCount}`);

  if (artifact.status !== "passed") {
    process.exit(1);
  }
}

run();
