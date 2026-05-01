import fs from "fs";
import path from "path";
import {
  PROVIDER_DEPLOYMENT_REQUIREMENTS,
  type DeploymentEnvironmentId,
  type DeploymentProviderId,
} from "./deploymentProviderContracts";
import type {
  LiveDeploymentExecutionIngestion,
  LiveDeploymentExecutionIngestionRecord,
  LiveDeploymentProviderExecutionProof,
  LiveDeploymentProviderExecutionRecord,
} from "./liveDeploymentProviderExecutionSchema";

type DomainId =
  | "web_saas_app"
  | "marketing_website"
  | "api_service"
  | "mobile_app"
  | "bot"
  | "ai_agent"
  | "game"
  | "dirty_repo_completion";

const ROOT = process.cwd();
const INGESTION_PATH = path.join(ROOT, "release-evidence", "runtime", "live_deployment_provider_execution_ingestion.json");
const OUT_PATH = path.join(ROOT, "release-evidence", "runtime", "live_deployment_provider_execution_proof.json");

const PROVIDER_TO_DOMAIN: Record<DeploymentProviderId, DomainId> = {
  vercel_web_deploy: "web_saas_app",
  github_release_handoff: "marketing_website",
  supabase_backend_deploy: "api_service",
  mobile_store_handoff: "mobile_app",
  bot_platform_deploy: "bot",
  ai_agent_runtime_deploy: "ai_agent",
  game_distribution_handoff: "game",
  dirty_repo_completion_handoff: "dirty_repo_completion",
};

function ensureDir(filePath: string) {
  fs.mkdirSync(path.dirname(filePath), { recursive: true });
}

function writeJson(filePath: string, value: unknown) {
  ensureDir(filePath);
  fs.writeFileSync(filePath, JSON.stringify(value, null, 2));
}

function loadJson(filePath: string): any | null {
  try {
    return JSON.parse(fs.readFileSync(filePath, "utf8"));
  } catch {
    return null;
  }
}

function createDefaultIngestion(providerIds: DeploymentProviderId[]): LiveDeploymentExecutionIngestion {
  const records: LiveDeploymentExecutionIngestionRecord[] = providerIds.map((providerId) => ({
    providerId,
    domainId: PROVIDER_TO_DOMAIN[providerId],
    environment: "prod",
    runId: `pending_${providerId}`,
    liveExecutionPerformed: false,
    usedRealCredentials: false,
    calledRealProviderApis: false,
    smokeTestsPassed: false,
    rollbackVerified: false,
    deploymentLogRef: "pending_deployment_log_ref",
    smokeTestLogRef: "pending_smoke_test_log_ref",
    rollbackLogRef: "pending_rollback_log_ref",
    executedAt: new Date(0).toISOString(),
    notes: "Scaffold record: replace with real provider execution evidence.",
  }));

  return {
    schemaVersion: "1.0",
    claimId: "fully_built_live_and_autobuild_99_percent_of_supported_scope",
    records,
    generatedAt: new Date().toISOString(),
    caveat:
      "Fail-closed ingestion scaffold: replace pending refs with real deployment, smoke, and rollback evidence references per provider run.",
  };
}

function hasEvidenceRef(ref: string): boolean {
  const value = String(ref || "").trim().toLowerCase();
  if (!value) return false;
  return !(value.includes("pending") || value.includes("todo") || value === "n/a");
}

function pickLatestRecord(records: LiveDeploymentExecutionIngestionRecord[]): LiveDeploymentExecutionIngestionRecord {
  return records
    .slice()
    .sort((a, b) => String(a.executedAt || "").localeCompare(String(b.executedAt || "")))
    .at(-1)!;
}

function createBlockedRecord(providerId: DeploymentProviderId, environment: DeploymentEnvironmentId): LiveDeploymentProviderExecutionRecord {
  const domainId = PROVIDER_TO_DOMAIN[providerId];
  return {
    providerId,
    domainId,
    environment,
    liveExecutionPerformed: false,
    usedRealCredentials: false,
    calledRealProviderApis: false,
    smokeTestsPassed: false,
    rollbackVerified: false,
    executionEvidenceRef: "pending_live_execution_evidence",
    smokeEvidenceRef: "pending_smoke_test_log_ref",
    rollbackEvidenceRef: "pending_rollback_log_ref",
  };
}

function run() {
  const providerIds = Object.keys(PROVIDER_DEPLOYMENT_REQUIREMENTS) as DeploymentProviderId[];
  if (!fs.existsSync(INGESTION_PATH)) {
    writeJson(INGESTION_PATH, createDefaultIngestion(providerIds));
  }

  const ingestionIssues: string[] = [];
  const parsed = loadJson(INGESTION_PATH) as LiveDeploymentExecutionIngestion | null;
  const ingestionRecords = Array.isArray(parsed?.records) ? parsed!.records : [];

  if (parsed === null) ingestionIssues.push("ingestion_json_invalid");
  if (!Array.isArray(parsed?.records)) ingestionIssues.push("ingestion_records_missing_or_invalid");

  const recordsByProvider = new Map<DeploymentProviderId, LiveDeploymentExecutionIngestionRecord[]>();
  for (const providerId of providerIds) recordsByProvider.set(providerId, []);

  for (const record of ingestionRecords) {
    const providerId = record?.providerId as DeploymentProviderId;
    if (!recordsByProvider.has(providerId)) {
      ingestionIssues.push(`unknown_provider_in_ingestion:${String(providerId)}`);
      continue;
    }
    recordsByProvider.get(providerId)!.push(record);
  }

  const providers: LiveDeploymentProviderExecutionRecord[] = providerIds.map((providerId) => {
    const list = recordsByProvider.get(providerId) || [];
    if (list.length === 0) return createBlockedRecord(providerId, "prod");

    const latest = pickLatestRecord(list);
    return {
      providerId,
      domainId: PROVIDER_TO_DOMAIN[providerId],
      environment: (latest.environment as DeploymentEnvironmentId) || "prod",
      liveExecutionPerformed: latest.liveExecutionPerformed === true,
      usedRealCredentials: latest.usedRealCredentials === true,
      calledRealProviderApis: latest.calledRealProviderApis === true,
      smokeTestsPassed: latest.smokeTestsPassed === true,
      rollbackVerified: latest.rollbackVerified === true,
      executionEvidenceRef: latest.deploymentLogRef || "pending_live_execution_evidence",
      smokeEvidenceRef: latest.smokeTestLogRef || "pending_smoke_test_log_ref",
      rollbackEvidenceRef: latest.rollbackLogRef || "pending_rollback_log_ref",
      sourceRunId: latest.runId,
      executedAt: latest.executedAt,
    };
  });

  const coveredProviderCount = providers.filter((p) => p.liveExecutionPerformed).length;
  const measurableProgressCount = providers.filter(
    (p) => hasEvidenceRef(p.executionEvidenceRef) || hasEvidenceRef(p.smokeEvidenceRef || "") || hasEvidenceRef(p.rollbackEvidenceRef || "")
  ).length;
  const requiredProviderCount = providerIds.length;
  const progressPercent = requiredProviderCount > 0 ? Number(((measurableProgressCount / requiredProviderCount) * 100).toFixed(2)) : 0;

  const allProvidersLiveProven = providers.every(
    (provider) =>
      provider.liveExecutionPerformed &&
      provider.usedRealCredentials &&
      provider.calledRealProviderApis &&
      provider.smokeTestsPassed &&
      provider.rollbackVerified
  );

  const unmetRequirements: string[] = [];
  if (!allProvidersLiveProven) unmetRequirements.push("real_provider_execution_missing");
  if (!providers.every((provider) => provider.usedRealCredentials)) unmetRequirements.push("real_credential_usage_missing");
  if (!providers.every((provider) => provider.calledRealProviderApis)) unmetRequirements.push("real_provider_api_call_proof_missing");
  if (!providers.every((provider) => provider.smokeTestsPassed)) unmetRequirements.push("smoke_test_success_missing");
  if (!providers.every((provider) => provider.rollbackVerified)) unmetRequirements.push("rollback_verification_missing");
  if (!providers.every((provider) => hasEvidenceRef(provider.executionEvidenceRef))) unmetRequirements.push("deployment_log_reference_missing");
  if (!providers.every((provider) => hasEvidenceRef(provider.smokeEvidenceRef || ""))) unmetRequirements.push("smoke_log_reference_missing");
  if (!providers.every((provider) => hasEvidenceRef(provider.rollbackEvidenceRef || ""))) unmetRequirements.push("rollback_log_reference_missing");

  const status: LiveDeploymentProviderExecutionProof["status"] = allProvidersLiveProven
    ? "passed"
    : measurableProgressCount > 0
      ? "in_progress"
      : "blocked";

  const proof: LiveDeploymentProviderExecutionProof = {
    status,
    claimId: "fully_built_live_and_autobuild_99_percent_of_supported_scope",
    ingestionPath: "release-evidence/runtime/live_deployment_provider_execution_ingestion.json",
    requiredProviderCount,
    coveredProviderCount,
    measurableProgressCount,
    progressPercent,
    allProvidersLiveProven,
    providers,
    ingestionIssues,
    unmetRequirements,
    generatedAt: new Date().toISOString(),
    caveat:
      "Fail-closed scaffold with measurable progress: status remains blocked or in_progress until every provider has real execution, smoke, and rollback evidence.",
  };

  writeJson(OUT_PATH, proof);
  console.log(
    `Live deployment provider execution proof written: status=${proof.status} coveredProviders=${proof.coveredProviderCount}/${proof.requiredProviderCount} measurableProgress=${proof.measurableProgressCount}/${proof.requiredProviderCount}`
  );
}

run();
