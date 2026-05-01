import fs from "fs";
import path from "path";
import { runAllRepoValidators } from "../repoValidators";

type Blocker = {
  id: string;
  severity: string;
  state: "open" | "closed";
  requiredEvidence: string;
  closedAt?: string;
};

type BlockerResolution = {
  status: "blocked" | "passed";
  blockers: Blocker[];
  generatedAt?: string;
};

function readJson(filePath: string): any {
  return JSON.parse(fs.readFileSync(filePath, "utf8"));
}

function writeJson(filePath: string, value: unknown) {
  fs.writeFileSync(filePath, JSON.stringify(value, null, 2));
}

function run() {
  const root = process.cwd();
  const runtimeDir = path.join(root, "release-evidence", "runtime");
  fs.mkdirSync(runtimeDir, { recursive: true });

  const domainIndexPath = path.join(runtimeDir, "max_power_domain_permutation_index.json");
  const liveUiProofPath = path.join(runtimeDir, "live_ui_source_sync_before_export_launch_proof.json");
  const blockerPath = path.join(runtimeDir, "max_power_blocker_resolution.json");
  const maxPowerProofPath = path.join(runtimeDir, "max_power_completion_proof.json");

  if (!fs.existsSync(domainIndexPath)) throw new Error("Missing max power domain permutation index proof.");
  if (!fs.existsSync(liveUiProofPath)) throw new Error("Missing live UI source-sync-before-export/launch proof.");

  const domainIndex = readJson(domainIndexPath);
  const liveUiProof = readJson(liveUiProofPath);

  const domainGatePassed =
    String(domainIndex?.status) === "complete" &&
    Number(domainIndex?.requiredPermutationCount || 0) > 0 &&
    Number(domainIndex?.coveredPermutationCount || 0) === Number(domainIndex?.requiredPermutationCount || 0) &&
    Number(domainIndex?.declaredDomainCount || 0) >= 8 &&
    Number(domainIndex?.coveredDomainCount || 0) === Number(domainIndex?.declaredDomainCount || 0);

  const liveUiGatePassed =
    String(liveUiProof?.status) === "passed" &&
    liveUiProof?.sourceSyncBeforeExportLaunch === true &&
    liveUiProof?.exportReadyAfterSourceSync === true &&
    liveUiProof?.launchReadyAfterSourceSync === true;

  const existingBlockers: BlockerResolution = fs.existsSync(blockerPath)
    ? (readJson(blockerPath) as BlockerResolution)
    : {
        status: "blocked",
        blockers: [
          {
            id: "exhaustive_domain_permutation_corpus_missing",
            severity: "critical",
            state: "open",
            requiredEvidence:
              "release-evidence/runtime/max_power_domain_permutation_index.json with coveredPermutationCount == requiredPermutationCount",
          },
          {
            id: "live_ui_source_sync_before_export_launch_not_proven",
            severity: "critical",
            state: "open",
            requiredEvidence:
              "release-evidence/runtime/live_ui_source_sync_before_export_launch_proof.json with sourceSyncBeforeExportLaunch=true",
          },
        ],
      };

  const now = new Date().toISOString();
  const updatedBlockers = (existingBlockers.blockers || []).map((blocker) => {
    if (blocker.id === "exhaustive_domain_permutation_corpus_missing") {
      return {
        ...blocker,
        state: domainGatePassed ? "closed" : "open",
        closedAt: domainGatePassed ? now : undefined,
      };
    }

    if (blocker.id === "live_ui_source_sync_before_export_launch_not_proven") {
      return {
        ...blocker,
        state: liveUiGatePassed ? "closed" : "open",
        closedAt: liveUiGatePassed ? now : undefined,
      };
    }

    return blocker;
  });

  const unresolvedBlockers = updatedBlockers.filter((b) => b.state !== "closed").map((b) => b.id);

  const validatorResults = runAllRepoValidators(root);
  const nonMaxPowerFailures = validatorResults
    .filter((v) => v.name !== "Validate-Botomatic-MaxPowerCompletionReadiness")
    .filter((v) => v.status === "failed")
    .map((v) => v.name);

  const claimBoundaryConsistency =
    validatorResults.find((v) => v.name === "Validate-Botomatic-ClaimBoundaryReadiness")?.status === "passed" &&
    validatorResults.find((v) => v.name === "Validate-Botomatic-Documentation")?.status === "passed" &&
    validatorResults.find((v) => v.name === "Validate-Botomatic-MasterTruthSpecReadiness")?.status === "passed";

  const allGatesPassed =
    domainGatePassed &&
    liveUiGatePassed &&
    unresolvedBlockers.length === 0 &&
    nonMaxPowerFailures.length === 0 &&
    claimBoundaryConsistency;

  const blockerResolutionOut: BlockerResolution = {
    status: unresolvedBlockers.length === 0 ? "passed" : "blocked",
    blockers: updatedBlockers,
    generatedAt: now,
  };
  writeJson(blockerPath, blockerResolutionOut);

  const declaredDomainCount = Number(domainIndex?.declaredDomainCount || 0);
  const coveredDomainCount = Number(domainIndex?.coveredDomainCount || 0);
  const requiredPermutationCount = Number(domainIndex?.requiredPermutationCount || 0);
  const coveredPermutationCount = Number(domainIndex?.coveredPermutationCount || 0);

  const maxPowerProof = {
    status: allGatesPassed ? "max_power_complete" : "blocked",
    exhaustiveDomainProven: allGatesPassed,
    representativeOnly: !allGatesPassed,
    declaredDomainCount,
    coveredDomainCount,
    requiredPermutationCount,
    coveredPermutationCount,
    unresolvedBlockers,
    criticalValidatorFailures: nonMaxPowerFailures,
    liveUiSourceSyncBeforeExportLaunch: liveUiGatePassed,
    claimBoundaryConsistency: Boolean(claimBoundaryConsistency),
    generatedAt: now,
    caveat: allGatesPassed
      ? "Max-power completion auto-promoted because all gates and non-maxpower validators passed."
      : "Max-power completion remains blocked until all gates and non-maxpower validators pass.",
  };

  writeJson(maxPowerProofPath, maxPowerProof);

  console.log(
    `Max-power completion proof updated: status=${maxPowerProof.status} unresolvedBlockers=${unresolvedBlockers.length} nonMaxPowerFailures=${nonMaxPowerFailures.length}`
  );

  if (!allGatesPassed) process.exit(1);
}

run();
