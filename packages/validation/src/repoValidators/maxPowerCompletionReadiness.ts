import fs from "fs";
import path from "path";
import type { RepoValidatorResult } from "../repoValidators";

type MaxPowerProof = {
  status?: string;
  maxPowerComplete?: boolean;
  supportedDomainMaxPowerComplete?: boolean;
  representativeOnly?: boolean;
  exhaustiveSupportedDomainProof?: boolean;
  liveUiSourceSyncProof?: boolean;
  noDemoContaminationForRealProjects?: boolean;
  intakeProjectMutationContractProof?: boolean;
  blockersClosed?: boolean;
  criticalFailures?: number;
};

type DomainPermutationIndexProof = {
  status?: string;
  declaredDomainCount?: number;
  coveredDomainCount?: number;
  requiredPermutationCount?: number;
  coveredPermutationCount?: number;
  criticalFailures?: number;
  placeholderFailures?: number;
};

type LiveUiSourceSyncProof = {
  status?: string;
  sourceBackedLiveUiModel?: boolean;
  previewEditApplied?: boolean;
  sourcePatchWritten?: boolean;
  sourceSyncBeforeExportLaunch?: boolean;
  exportReadyAfterSourceSync?: boolean;
  launchReadyAfterSourceSync?: boolean;
  stalePreviewOnlyStateBlocked?: boolean;
  unsyncedExportBlocked?: boolean;
  unsyncedLaunchBlocked?: boolean;
  compileAfterSourceSyncPassed?: boolean;
  rollbackAfterFailedSyncPassed?: boolean;
  criticalFailures?: number;
};

type MaxPowerBlockerResolution = {
  status?: string;
  blockers?: Array<{ id?: string; state?: string; evidence?: string }>;
  criticalFailures?: number;
};

type NoDemoAudit = {
  status?: string;
  criticalFailures?: number;
};

type IntakeMutationContract = {
  status?: string;
  intakeSubmitMutationPassed?: boolean;
  promptSubmitMutationPassed?: boolean;
  suggestionSubmitMutationPassed?: boolean;
  projectCreationMutationPassed?: boolean;
  backend500sResolved?: boolean;
  payloadSchemaValidated?: boolean;
  e2eOwnerLaunchCoversRealMutation?: boolean;
  criticalFailures?: number;
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
    "release-evidence/runtime/no_demo_contamination_audit.json",
    "release-evidence/runtime/intake_project_mutation_contract_proof.json",
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

  if (!/release-candidate foundation lock vs max-power completion/i.test(spec)) {
    return fail("MASTER_TRUTH_SPEC.md must preserve release-candidate-vs-max-power completion language.", checks);
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
  const noDemoAuditPath = "release-evidence/runtime/no_demo_contamination_audit.json";
  const intakeMutationPath = "release-evidence/runtime/intake_project_mutation_contract_proof.json";

  let proof: MaxPowerProof;
  let domainIndex: DomainPermutationIndexProof;
  let liveUiProof: LiveUiSourceSyncProof;
  let blockerResolution: MaxPowerBlockerResolution;
  let noDemoAudit: NoDemoAudit;
  let intakeMutation: IntakeMutationContract;
  try {
    proof = JSON.parse(read(root, proofPath)) as MaxPowerProof;
    domainIndex = JSON.parse(read(root, domainIndexPath)) as DomainPermutationIndexProof;
    liveUiProof = JSON.parse(read(root, liveUiProofPath)) as LiveUiSourceSyncProof;
    blockerResolution = JSON.parse(read(root, blockerResolutionPath)) as MaxPowerBlockerResolution;
    noDemoAudit = JSON.parse(read(root, noDemoAuditPath)) as NoDemoAudit;
    intakeMutation = JSON.parse(read(root, intakeMutationPath)) as IntakeMutationContract;
  } catch {
    return fail("Max-power completion evidence artifacts are not valid JSON.", checks);
  }

  if (proof.status !== "passed" || proof.maxPowerComplete !== true || proof.supportedDomainMaxPowerComplete !== true) {
    return fail("Max-power completion proof must be passed and assert supported-domain max-power completion.", checks);
  }

  if (
    proof.representativeOnly !== false ||
    proof.exhaustiveSupportedDomainProof !== true ||
    proof.liveUiSourceSyncProof !== true ||
    proof.noDemoContaminationForRealProjects !== true ||
    proof.intakeProjectMutationContractProof !== true ||
    proof.blockersClosed !== true ||
    Number(proof.criticalFailures || 0) !== 0
  ) {
    return fail("Max-power completion proof must satisfy all required booleans with zero critical failures.", checks);
  }

  if (
    domainIndex.status !== "passed" ||
    Number(domainIndex.declaredDomainCount || 0) !== 8 ||
    Number(domainIndex.coveredDomainCount || 0) !== 8 ||
    Number(domainIndex.requiredPermutationCount || 0) !== 100 ||
    Number(domainIndex.coveredPermutationCount || 0) !== 100 ||
    Number(domainIndex.criticalFailures || 0) !== 0 ||
    Number(domainIndex.placeholderFailures || 0) !== 0
  ) {
    return fail("Domain permutation index must satisfy required 8-domain/100-permutation schema with zero failures.", checks);
  }

  if (
    liveUiProof.status !== "passed" ||
    liveUiProof.sourceBackedLiveUiModel !== true ||
    liveUiProof.previewEditApplied !== true ||
    liveUiProof.sourcePatchWritten !== true ||
    liveUiProof.sourceSyncBeforeExportLaunch !== true ||
    liveUiProof.exportReadyAfterSourceSync !== true ||
    liveUiProof.launchReadyAfterSourceSync !== true ||
    liveUiProof.stalePreviewOnlyStateBlocked !== true ||
    liveUiProof.unsyncedExportBlocked !== true ||
    liveUiProof.unsyncedLaunchBlocked !== true ||
    liveUiProof.compileAfterSourceSyncPassed !== true ||
    liveUiProof.rollbackAfterFailedSyncPassed !== true ||
    Number(liveUiProof.criticalFailures || 0) !== 0
  ) {
    return fail("Live UI source-sync proof must satisfy all required booleans and zero critical failures.", checks);
  }

  if (noDemoAudit.status !== "passed" || Number(noDemoAudit.criticalFailures || 0) !== 0) {
    return fail("No-demo contamination audit must pass with zero critical failures.", checks);
  }

  if (
    intakeMutation.status !== "passed" ||
    intakeMutation.intakeSubmitMutationPassed !== true ||
    intakeMutation.promptSubmitMutationPassed !== true ||
    intakeMutation.suggestionSubmitMutationPassed !== true ||
    intakeMutation.projectCreationMutationPassed !== true ||
    intakeMutation.backend500sResolved !== true ||
    intakeMutation.payloadSchemaValidated !== true ||
    intakeMutation.e2eOwnerLaunchCoversRealMutation !== true ||
    Number(intakeMutation.criticalFailures || 0) !== 0
  ) {
    return fail("Intake/project mutation contract proof must satisfy all required booleans and zero critical failures.", checks);
  }

  const blockerIds = new Set((blockerResolution.blockers || []).map((item) => String(item.id || "")));
  const requiredBlockers = [
    "MAX-POWER-DOMAIN-PERMUTATION-CORPUS",
    "LIVE-UI-SOURCE-SYNC-BEFORE-EXPORT-LAUNCH",
    "NO-DEMO-CONTAMINATION-REAL-PROJECTS",
    "INTAKE-PROJECT-MUTATION-CONTRACT",
  ];

  if (
    blockerResolution.status !== "passed" ||
    Number(blockerResolution.criticalFailures || 0) !== 0 ||
    requiredBlockers.some((id) => !blockerIds.has(id)) ||
    (blockerResolution.blockers || []).some((item) => String(item.state) !== "closed")
  ) {
    return fail("Max-power blocker resolution must include all required closed blockers with zero critical failures.", checks);
  }

  return pass("Max-power completion gates are satisfied with exhaustive supported-domain proof evidence.", checks);
}
