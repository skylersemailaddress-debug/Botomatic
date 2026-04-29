import { createCompletionPlan } from "../../repo-repair/src/completionPlanner";
import {
  buildDirtyRepoRepairLoopProof,
  type DirtyRepoRepairLoopProof,
} from "./dirtyRepoRepairLoop";
import {
  createDirtyRepoEvidenceSnapshot,
  deriveDirtyRepoCompletionBlockers,
  summarizeDirtyRepoEvidence,
  type DirtyRepoCompletionArea,
  type DirtyRepoCompletionBlocker,
  type DirtyRepoEvidenceEntry,
  type DirtyRepoEvidenceSnapshot,
} from "../../repo-intake/src/dirtyRepoEvidence";

export type CompletionContract = {
  detectedProduct: string;
  detectedStack: string[];
  currentState: string;
  brokenAreas: string[];
  missingAreas: string[];
  placeholderAreas: string[];
  securityGaps: string[];
  dataModelGaps: string[];
  uxGaps: string[];
  testGaps: string[];
  deploymentGaps: string[];
  commercialLaunchBlockers: string[];
  recommendedCompletionPlan: string[];
  mustAnswerQuestions: string[];
  safeAssumptions: string[];
  definitionOfDone: string[];
  evidenceSnapshot: DirtyRepoEvidenceSnapshot;
  evidenceEntries: DirtyRepoEvidenceEntry[];
  completionBlockers: DirtyRepoCompletionBlocker[];
  completionContractV2?: DirtyRepoCompletionContractV2;
  repairLoopProof?: DirtyRepoRepairLoopProof;
};

export type DirtyRepoCompletionStatus = "blocked" | "repair_ready" | "validation_ready" | "candidate_ready";

type ExitCriterionId =
  | "install_build_path_known"
  | "test_command_known"
  | "no_placeholder_scan_required"
  | "security_scan_required"
  | "integration_boundaries_documented"
  | "deployment_boundary_documented"
  | "proof_ledger_entry_required"
  | "user_approval_required_before_claim_expansion";

export type DirtyRepoCompletionExitCriterion = {
  id: ExitCriterionId;
  label: string;
  measurable: true;
  satisfied: boolean;
  evidenceEntryIds: string[];
};

export type DirtyRepoCompletionMilestone = {
  id: string;
  label: string;
  done: boolean;
  evidenceEntryIds: string[];
};

export type DirtyRepoCompletionRisk = {
  id: string;
  severity: "low" | "medium" | "high" | "critical";
  message: string;
  evidenceEntryIds: string[];
};

export type DirtyRepoCompletionProofConsistency = {
  status: "passed" | "blocked" | "needs_evidence";
  reasons: string[];
  failedCriticalValidatorIds: string[];
};

export type DirtyRepoCompletionContractV2 = {
  contractVersion: "2.0";
  generatedAt: string;
  detectedProduct: string;
  detectedStack: string[];
  evidenceSnapshot: DirtyRepoEvidenceSnapshot;
  evidenceSummary: string;
  blockers: DirtyRepoCompletionBlocker[];
  completionAreas: DirtyRepoCompletionArea[];
  milestones: DirtyRepoCompletionMilestone[];
  exitCriteria: DirtyRepoCompletionExitCriterion[];
  risks: DirtyRepoCompletionRisk[];
  proofConsistency: DirtyRepoCompletionProofConsistency;
  claimBoundary: string;
  recommendedNextActions: string[];
  status: DirtyRepoCompletionStatus;
  legacyCompat: {
    commercialLaunchBlockers: string[];
    recommendedCompletionPlan: string[];
  };
};

export function buildDirtyRepoCompletionContractV2(input: {
  detectedProduct: string;
  detectedStack: string[];
  evidenceSnapshot?: DirtyRepoEvidenceSnapshot;
  completionBlockers?: DirtyRepoCompletionBlocker[];
  criticalValidatorFailures?: string[];
  evidenceMaxAgeMs?: number;
  generatedAt?: string;
  legacyBlockers?: string[];
  legacyPlan?: string[];
}): DirtyRepoCompletionContractV2 {
  const nowIso = input.generatedAt || new Date().toISOString();
  const evidenceSnapshot = input.evidenceSnapshot || createDirtyRepoEvidenceSnapshot({ entries: [] });
  const blockers = input.completionBlockers || deriveDirtyRepoCompletionBlockers(evidenceSnapshot);
  const evidenceIds = new Set(evidenceSnapshot.entries.map((e) => e.id));
  const hasEvidence = evidenceSnapshot.entries.length > 0;
  const stale = input.evidenceMaxAgeMs
    ? Date.now() - new Date(evidenceSnapshot.capturedAt).getTime() > input.evidenceMaxAgeMs
    : false;
  const failedCriticalValidatorIds = (input.criticalValidatorFailures || []).filter(Boolean);
  const reasons: string[] = [];
  if (!hasEvidence) reasons.push("Evidence snapshot has no entries.");
  if (stale) reasons.push("Evidence snapshot is stale.");
  if (failedCriticalValidatorIds.length > 0) reasons.push("Critical validator failure present.");
  if (blockers.some((b) => !Array.isArray(b.evidenceEntryIds) || b.evidenceEntryIds.length === 0)) {
    reasons.push("One or more blockers are missing evidenceEntryIds.");
  }
  const proofConsistency: DirtyRepoCompletionProofConsistency = {
    status: !hasEvidence || stale ? "needs_evidence" : reasons.length > 0 ? "blocked" : "passed",
    reasons,
    failedCriticalValidatorIds,
  };

  const exitCriteria: DirtyRepoCompletionExitCriterion[] = [
    { id: "install_build_path_known", label: "Install/build path known", measurable: true, satisfied: hasEvidence, evidenceEntryIds: [] },
    { id: "test_command_known", label: "Test command known", measurable: true, satisfied: hasEvidence, evidenceEntryIds: [] },
    { id: "no_placeholder_scan_required", label: "No-placeholder scan required", measurable: true, satisfied: true, evidenceEntryIds: [] },
    { id: "security_scan_required", label: "Security scan required", measurable: true, satisfied: true, evidenceEntryIds: evidenceSnapshot.entries.filter((e) => e.category === "security").map((e) => e.id) },
    { id: "integration_boundaries_documented", label: "Integration boundaries documented", measurable: true, satisfied: true, evidenceEntryIds: evidenceSnapshot.entries.filter((e) => e.category === "integration").map((e) => e.id) },
    { id: "deployment_boundary_documented", label: "Deployment boundary documented", measurable: true, satisfied: true, evidenceEntryIds: [] },
    { id: "proof_ledger_entry_required", label: "Proof ledger entry required", measurable: true, satisfied: true, evidenceEntryIds: [] },
    { id: "user_approval_required_before_claim_expansion", label: "User approval required before claim expansion", measurable: true, satisfied: true, evidenceEntryIds: [] },
  ];

  const milestones: DirtyRepoCompletionMilestone[] = [
    { id: "m1", label: "Document completion boundaries", done: true, evidenceEntryIds: [] },
    { id: "m2", label: "Resolve evidence-linked blockers", done: blockers.length === 0, evidenceEntryIds: blockers.flatMap((b) => b.evidenceEntryIds) },
    { id: "m3", label: "Run validator/proof pass", done: proofConsistency.status === "passed", evidenceEntryIds: [] },
  ];

  const risks: DirtyRepoCompletionRisk[] = evidenceSnapshot.entries.map((entry) => ({
    id: `risk_${entry.id}`,
    severity: entry.severity,
    message: entry.message,
    evidenceEntryIds: [entry.id],
  }));

  const contract: DirtyRepoCompletionContractV2 = {
    contractVersion: "2.0",
    generatedAt: nowIso,
    detectedProduct: input.detectedProduct,
    detectedStack: input.detectedStack,
    evidenceSnapshot,
    evidenceSummary: summarizeDirtyRepoEvidence(evidenceSnapshot),
    blockers,
    completionAreas: Array.from(new Set(blockers.map((b) => b.area))),
    milestones,
    exitCriteria,
    risks,
    proofConsistency,
    claimBoundary: "candidate_ready is non-launch evidence only; launch/production claims remain out of scope",
    recommendedNextActions: blockers.map((b) => `Resolve ${b.area}: ${b.message}`),
    status: "blocked",
    legacyCompat: {
      commercialLaunchBlockers: input.legacyBlockers || blockers.map((b) => b.message),
      recommendedCompletionPlan: input.legacyPlan || [],
    },
  };
  contract.status = deriveDirtyRepoCompletionStatus(contract);
  return contract;
}

export function deriveDirtyRepoCompletionStatus(contract: DirtyRepoCompletionContractV2): DirtyRepoCompletionStatus {
  if (contract.proofConsistency.status !== "passed") return "blocked";
  const unresolvedBlockers = contract.blockers.length > 0;
  const anyCriterionUnsatisfied = contract.exitCriteria.some((c) => !c.satisfied);
  if (unresolvedBlockers) return "repair_ready";
  if (anyCriterionUnsatisfied) return "validation_ready";
  return "candidate_ready";
}

export function validateDirtyRepoCompletionContractV2(contract: DirtyRepoCompletionContractV2): string[] {
  const errors: string[] = [];
  if (contract.contractVersion !== "2.0") errors.push("contractVersion must be 2.0");
  contract.blockers.forEach((b, i) => {
    if (!Array.isArray(b.evidenceEntryIds) || b.evidenceEntryIds.length === 0) {
      errors.push(`blockers[${i}] missing evidenceEntryIds`);
    }
  });
  if (contract.proofConsistency.status === "passed" && contract.proofConsistency.failedCriticalValidatorIds.length > 0) {
    errors.push("proofConsistency cannot be passed when critical validators fail");
  }
  if (["launch_ready", "production_ready"].includes(String((contract as any).status))) {
    errors.push("invalid status boundary");
  }
  return errors;
}

export function summarizeDirtyRepoCompletionContractV2(contract: DirtyRepoCompletionContractV2): string {
  return `${contract.status}; blockers=${contract.blockers.length}; proof=${contract.proofConsistency.status}; evidence=${contract.evidenceSnapshot.summary.totalEntries}`;
}

export function runCompletionContract(input: {
  detectedProduct: string;
  detectedStack: string[];
  blockers: string[];
  evidenceSnapshot?: DirtyRepoEvidenceSnapshot;
  completionBlockers?: DirtyRepoCompletionBlocker[];
  criticalValidatorFailures?: string[];
}): CompletionContract {
  const phases = createCompletionPlan({ blockers: input.blockers });
  const evidenceSnapshot = input.evidenceSnapshot || createDirtyRepoEvidenceSnapshot({ entries: [] });
  const completionBlockers = input.completionBlockers || [];
  const recommendedCompletionPlan = phases.map((phase) => `${phase.title}: ${phase.goals.join(", ")}`);

  const completionContractV2 = evidenceSnapshot.entries.length
    ? buildDirtyRepoCompletionContractV2({
        detectedProduct: input.detectedProduct,
        detectedStack: input.detectedStack,
        evidenceSnapshot,
        completionBlockers,
        criticalValidatorFailures: input.criticalValidatorFailures,
        legacyBlockers: input.blockers,
        legacyPlan: recommendedCompletionPlan,
      })
    : undefined;

  const repairLoopProof = completionContractV2
    ? buildDirtyRepoRepairLoopProof({
        evidenceSnapshot,
        completionContractV2,
      })
    : undefined;

  return {
    detectedProduct: input.detectedProduct,
    detectedStack: input.detectedStack,
    currentState: "ingested_existing_repo",
    brokenAreas: input.blockers,
    missingAreas: [],
    placeholderAreas: [],
    securityGaps: [],
    dataModelGaps: [],
    uxGaps: [],
    testGaps: [],
    deploymentGaps: [],
    commercialLaunchBlockers: input.blockers,
    recommendedCompletionPlan,
    mustAnswerQuestions: ["Which launch workflows are non-negotiable?"],
    safeAssumptions: ["Preserve working user code unless replacement is approved"],
    definitionOfDone: [
      "Install/build/test path is stable",
      "No placeholders in production paths",
      "Security/deployment validators pass",
      "Proof ledger entry is recorded",
    ],
    evidenceSnapshot,
    evidenceEntries: evidenceSnapshot.entries,
    completionBlockers,
    completionContractV2,
    repairLoopProof,
  };
}
