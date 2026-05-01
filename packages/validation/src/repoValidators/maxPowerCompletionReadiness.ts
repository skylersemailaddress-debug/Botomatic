import fs from "fs";
import path from "path";
import type { RepoValidatorResult } from "../repoValidators";

type MaxPowerProof = {
  status?: string;
  exhaustiveDomainProven?: boolean;
  representativeOnly?: boolean;
  declaredDomainCount?: number;
  coveredDomainCount?: number;
  requiredPermutationCount?: number;
  coveredPermutationCount?: number;
  unresolvedBlockers?: unknown[];
  criticalValidatorFailures?: unknown[];
  liveUiSourceSyncBeforeExportLaunch?: boolean;
  claimBoundaryConsistency?: boolean;
};

type DomainPermutationIndexProof = {
  status?: string;
  declaredDomainCount?: number;
  coveredDomainCount?: number;
  requiredPermutationCount?: number;
  coveredPermutationCount?: number;
};

type LiveUiSourceSyncProof = {
  status?: string;
  sourceSyncBeforeExportLaunch?: boolean;
  exportReadyAfterSourceSync?: boolean;
  launchReadyAfterSourceSync?: boolean;
};

type MaxPowerBlockerResolution = {
  status?: string;
  blockers?: Array<{ id?: string; state?: string }>;
};

function has(root: string, rel: string): boolean {
  return fs.existsSync(path.join(root, rel));
}

function read(root: string, rel: string): string {
  return fs.readFileSync(path.join(root, rel), "utf8");
}

function fail(summary: string, checks: string[]): RepoValidatorResult {
  return {
    name: "Validate-Botomatic-MaxPowerCompletionReadiness",
    status: "failed",
    summary,
    checks,
  };
}

function pass(summary: string, checks: string[]): RepoValidatorResult {
  return {
    name: "Validate-Botomatic-MaxPowerCompletionReadiness",
    status: "passed",
    summary,
    checks,
  };
}

export function validateMaxPowerCompletionReadiness(root: string): RepoValidatorResult {
  const checks = [
    "MASTER_TRUTH_SPEC.md",
    "MAX_POWER_COMPLETION_PROGRAM.md",
    "EVIDENCE_BOUNDARY_POLICY.md",
    "release-evidence/runtime/max_power_completion_proof.json",
    "release-evidence/runtime/max_power_domain_permutation_index.json",
    "release-evidence/runtime/live_ui_source_sync_before_export_launch_proof.json",
    "release-evidence/runtime/max_power_blocker_resolution.json",
  ];

  for (const rel of checks.slice(0, 3)) {
    if (!has(root, rel)) return fail(`Required max-power governance file missing: ${rel}`, checks);
  }

  for (const rel of checks.slice(3)) {
    if (!has(root, rel)) return fail(`Required max-power evidence artifact missing: ${rel}`, checks);
  }

  const spec = read(root, "MASTER_TRUTH_SPEC.md");
  const program = read(root, "MAX_POWER_COMPLETION_PROGRAM.md");
  const evidencePolicy = read(root, "EVIDENCE_BOUNDARY_POLICY.md");

  if (!/release-candidate foundation[\s\S]*not[\s\S]*max-power/i.test(spec)) {
    return fail("MASTER_TRUTH_SPEC.md must preserve foundation-vs-max-power boundary.", checks);
  }

  if (!/max-power completion is achieved only when all gates below are true/i.test(program)) {
    return fail("MAX_POWER_COMPLETION_PROGRAM.md must define objective completion gates.", checks);
  }

  if (!/exhaustive-domain-proven/i.test(evidencePolicy)) {
    return fail("EVIDENCE_BOUNDARY_POLICY.md must require exhaustive-domain-proven evidence for universal claims.", checks);
  }

  const proofPath = "release-evidence/runtime/max_power_completion_proof.json";
  const domainIndexPath = "release-evidence/runtime/max_power_domain_permutation_index.json";
  const liveUiProofPath = "release-evidence/runtime/live_ui_source_sync_before_export_launch_proof.json";
  const blockerResolutionPath = "release-evidence/runtime/max_power_blocker_resolution.json";

  let proof: MaxPowerProof;
  let domainIndex: DomainPermutationIndexProof;
  let liveUiProof: LiveUiSourceSyncProof;
  let blockerResolution: MaxPowerBlockerResolution;
  try {
    proof = JSON.parse(read(root, proofPath)) as MaxPowerProof;
    domainIndex = JSON.parse(read(root, domainIndexPath)) as DomainPermutationIndexProof;
    liveUiProof = JSON.parse(read(root, liveUiProofPath)) as LiveUiSourceSyncProof;
    blockerResolution = JSON.parse(read(root, blockerResolutionPath)) as MaxPowerBlockerResolution;
  } catch {
    return fail("Max-power completion evidence artifacts are not valid JSON.", checks);
  }

  if (proof.status !== "max_power_complete") {
    return fail("Max-power completion proof status must be max_power_complete.", checks);
  }

  if (proof.exhaustiveDomainProven !== true || proof.representativeOnly !== false) {
    return fail("Max-power completion proof must assert exhaustive-domain-proven and not representative-only.", checks);
  }

  const declaredDomainCount = Number(proof.declaredDomainCount || 0);
  const coveredDomainCount = Number(proof.coveredDomainCount || 0);
  if (declaredDomainCount < 8 || coveredDomainCount !== declaredDomainCount) {
    return fail("Max-power completion proof must cover all declared domains (minimum 8).", checks);
  }

  const requiredPermutationCount = Number(proof.requiredPermutationCount || 0);
  const coveredPermutationCount = Number(proof.coveredPermutationCount || 0);
  if (requiredPermutationCount <= 0 || coveredPermutationCount !== requiredPermutationCount) {
    return fail("Max-power completion proof must cover all required permutations.", checks);
  }

  if (String(domainIndex.status) !== "complete") {
    return fail("Domain permutation index must be complete for max-power completion.", checks);
  }

  if (
    Number(domainIndex.requiredPermutationCount || 0) <= 0 ||
    Number(domainIndex.coveredPermutationCount || 0) !== Number(domainIndex.requiredPermutationCount || 0) ||
    Number(domainIndex.declaredDomainCount || 0) < 8 ||
    Number(domainIndex.coveredDomainCount || 0) !== Number(domainIndex.declaredDomainCount || 0)
  ) {
    return fail("Domain permutation index must report exhaustive domain and permutation coverage.", checks);
  }

  if ((proof.unresolvedBlockers || []).length > 0) {
    return fail("Max-power completion proof cannot contain unresolved blockers.", checks);
  }

  if ((proof.criticalValidatorFailures || []).length > 0) {
    return fail("Max-power completion proof cannot contain critical validator failures.", checks);
  }

  if (proof.liveUiSourceSyncBeforeExportLaunch !== true) {
    return fail("Max-power completion proof must confirm live UI source-sync-before-export/launch requirement.", checks);
  }

  if (
    String(liveUiProof.status) !== "passed" ||
    liveUiProof.sourceSyncBeforeExportLaunch !== true ||
    liveUiProof.exportReadyAfterSourceSync !== true ||
    liveUiProof.launchReadyAfterSourceSync !== true
  ) {
    return fail("Live UI source-sync-before-export/launch proof must be passed and fully asserted.", checks);
  }

  if (proof.claimBoundaryConsistency !== true) {
    return fail("Max-power completion proof must confirm claim-boundary consistency across truth files.", checks);
  }

  const unresolvedBlockers = (blockerResolution.blockers || []).filter((b) => String(b.state) !== "closed");
  if (String(blockerResolution.status) !== "passed" || unresolvedBlockers.length > 0) {
    return fail("Max-power blocker resolution must be passed with all blockers closed.", checks);
  }

  return pass("Max-power completion gates are satisfied with exhaustive-domain proof evidence.", checks);
}
