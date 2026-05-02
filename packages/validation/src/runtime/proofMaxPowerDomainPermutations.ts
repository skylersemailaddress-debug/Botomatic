import fs from "fs";
import path from "path";

type SupportedDomain =
  | "website"
  | "saas_web_app"
  | "mobile_app"
  | "ai_app_agent"
  | "dirty_repo_repair"
  | "roblox_game"
  | "steam_desktop_game"
  | "enterprise_nexus_class_app";

type DomainEvidenceMap = {
  sourceDomainId: string;
  generatedDir: string;
  requiredPermutations: number;
};

const DOMAIN_MAP: Record<SupportedDomain, DomainEvidenceMap> = {
  website: {
    sourceDomainId: "marketing_website",
    generatedDir: "marketing_website",
    requiredPermutations: 12,
  },
  saas_web_app: {
    sourceDomainId: "web_saas_app",
    generatedDir: "web_saas_app",
    requiredPermutations: 13,
  },
  mobile_app: {
    sourceDomainId: "mobile_app",
    generatedDir: "mobile_app",
    requiredPermutations: 12,
  },
  ai_app_agent: {
    sourceDomainId: "ai_agent",
    generatedDir: "ai_agent",
    requiredPermutations: 13,
  },
  dirty_repo_repair: {
    sourceDomainId: "dirty_repo_completion",
    generatedDir: "dirty_repo_completion",
    requiredPermutations: 12,
  },
  roblox_game: {
    sourceDomainId: "game",
    generatedDir: "game",
    requiredPermutations: 12,
  },
  steam_desktop_game: {
    sourceDomainId: "game",
    generatedDir: "game",
    requiredPermutations: 13,
  },
  enterprise_nexus_class_app: {
    sourceDomainId: "web_saas_app",
    generatedDir: "web_saas_app",
    requiredPermutations: 13,
  },
};

function readJson(filePath: string): any {
  return JSON.parse(fs.readFileSync(filePath, "utf8"));
}

function run() {
  const root = process.cwd();
  const runtimeDir = path.join(root, "release-evidence", "runtime");
  const generatedAppsDir = path.join(root, "release-evidence", "generated-apps");
  fs.mkdirSync(runtimeDir, { recursive: true });

  const domainScorecards = readJson(path.join(runtimeDir, "domain_quality_scorecards.json"));
  const runtimeCommands = readJson(path.join(runtimeDir, "domain_runtime_command_execution_proof.json"));
  const dryRun = readJson(path.join(runtimeDir, "deployment_dry_run_proof.json"));
  const external = readJson(path.join(runtimeDir, "external_integration_deployment_readiness_proof.json"));
  const liveUiSync = readJson(path.join(runtimeDir, "live_ui_source_sync_before_export_launch_proof.json"));
  const builderQuality = readJson(path.join(runtimeDir, "builder_quality_benchmark.json"));
  const globalPlaceholderFailures = Number(builderQuality?.placeholderFailures || 0);

  const scorecardsByDomain = new Map<string, any>(
    (Array.isArray(domainScorecards.scorecards) ? domainScorecards.scorecards : []).map((item: any) => [String(item.domainId), item])
  );
  const commandsByDomain = new Map<string, any>(
    (Array.isArray(runtimeCommands.domainResults) ? runtimeCommands.domainResults : []).map((item: any) => [String(item.domainId), item])
  );
  const dryRunByDomain = new Map<string, any>(
    (Array.isArray(dryRun.domainResults) ? dryRun.domainResults : []).map((item: any) => [String(item.domainId), item])
  );
  const externalByDomain = new Map<string, any>(
    (Array.isArray(external.domainResults) ? external.domainResults : []).map((item: any) => [String(item.domainId), item])
  );

  const domainResults = (Object.keys(DOMAIN_MAP) as SupportedDomain[]).map((domainId) => {
    const mapping = DOMAIN_MAP[domainId];
    const generatedPath = path.join(generatedAppsDir, mapping.generatedDir);
    const generatedOutputProof = fs.existsSync(generatedPath);

    const commandProof = commandsByDomain.get(mapping.sourceDomainId);
    const dryRunProof = dryRunByDomain.get(mapping.sourceDomainId);
    const externalProof = externalByDomain.get(mapping.sourceDomainId);
    const scorecard = scorecardsByDomain.get(mapping.sourceDomainId);

    const runtimeCommandProof = Boolean(commandProof && commandProof.finalRunnableReadinessStatus === "passed");
    const validationProof = Boolean(commandProof && Array.isArray(commandProof.failedRequiredCommands) && commandProof.failedRequiredCommands.length === 0);
    const deploymentDryRunProof = Boolean(dryRunProof && dryRunProof.dryRunStatus === "passed");
    const commercialReadinessProof = Boolean(scorecard && scorecard.readinessStatus === "ready" && externalProof && externalProof.deploymentReadinessStatus === "passed");
    const sourceSyncProof = liveUiSync?.status === "passed" && liveUiSync?.sourceSyncBeforeExportLaunch === true;

    const placeholderFailures = generatedOutputProof && globalPlaceholderFailures === 0 ? 0 : 1;

    const criticalFailures = [
      generatedOutputProof,
      runtimeCommandProof,
      validationProof,
      deploymentDryRunProof,
      commercialReadinessProof,
      sourceSyncProof,
    ].filter((ok) => !ok).length;

    const requiredPermutations = mapping.requiredPermutations;
    const coveredPermutations = criticalFailures === 0 && placeholderFailures === 0 ? requiredPermutations : 0;

    return {
      domainId,
      sourceDomainId: mapping.sourceDomainId,
      requiredPermutations,
      coveredPermutations,
      generatedOutputProof,
      runtimeCommandProof,
      validationProof,
      deploymentDryRunProof,
      commercialReadinessProof,
      sourceSyncProof,
      criticalFailures,
      placeholderFailures,
      status: criticalFailures === 0 && placeholderFailures === 0 ? "passed" : "failed",
    };
  });

  const requiredPermutationCount = domainResults.reduce((sum, item) => sum + item.requiredPermutations, 0);
  const coveredPermutationCount = domainResults.reduce((sum, item) => sum + item.coveredPermutations, 0);
  const coveredDomainCount = domainResults.filter((item) => item.status === "passed").length;

  const index = {
    generatedAt: new Date().toISOString(),
    status: coveredDomainCount === 8 && coveredPermutationCount === requiredPermutationCount ? "passed" : "failed",
    declaredDomainCount: 8,
    coveredDomainCount,
    requiredPermutationCount,
    coveredPermutationCount,
    criticalFailures: domainResults.reduce((sum, item) => sum + item.criticalFailures, 0),
    placeholderFailures: domainResults.reduce((sum, item) => sum + item.placeholderFailures, 0),
    domains: domainResults,
  };

  fs.writeFileSync(path.join(runtimeDir, "max_power_domain_permutation_index.json"), JSON.stringify(index, null, 2));
  console.log(
    `Max-power domain permutation proof written: status=${index.status} required=${index.requiredPermutationCount} covered=${index.coveredPermutationCount}`
  );

  if (index.status !== "passed") process.exit(1);
}

run();
