export type ProofEvidenceClass =
  | "documentation"
  | "static_validator"
  | "runtime_validator"
  | "deployment_dry_run"
  | "credentialed_deployment_readiness"
  | "live_deployment_execution"
  | "self_upgrade_safety_contract"
  | "human_approval";

export type ProofEvidenceSource =
  | "manual"
  | "validator"
  | "runtime"
  | "ci"
  | "self_upgrade"
  | "other";

export type ProofClaimType =
  | "documentation_claim"
  | "readiness_claim"
  | "candidate_readiness_claim"
  | "deployment_readiness_claim"
  | "live_deployment_claim"
  | "self_upgrade_claim";

export type ProofLedgerOutcome = "passed" | "failed" | "blocked" | "needs_evidence";

export type ProofEvidenceRef = {
  id: string;
  evidenceClass: ProofEvidenceClass;
  source: ProofEvidenceSource;
  capturedAt?: string;
  path?: string;
  hash?: string;
  validatorId?: string;
  command?: string;
  summary?: string;
};

export type ProofSelfUpgradeSafetyRef = {
  mode?: "pr_only" | "read_only_proof" | "indeterminate";
  targetMainBlocked?: boolean;
  regressionMetadataFromCommandEvidence?: boolean;
  driftChecksEnabled?: boolean;
};

export type ProofLedgerEntry = {
  id: string;
  timestamp: string;
  scope: "self_upgrade" | "release" | "validator" | "benchmark";
  claim: string;
  evidence: Array<string | ProofEvidenceRef>;
  validatorSummary: string;
  outcome: ProofLedgerOutcome;
  rollbackPlan: string;
  claimType?: ProofClaimType;
  selfUpgradeSafety?: ProofSelfUpgradeSafetyRef;
};

export function createProofEntry(input: Omit<ProofLedgerEntry, "id" | "timestamp">): ProofLedgerEntry {
  return {
    ...input,
    id: `proof_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
    timestamp: new Date().toISOString(),
  };
}
