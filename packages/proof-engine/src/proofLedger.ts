export type ProofLedgerEntry = {
  id: string;
  timestamp: string;
  scope: "self_upgrade" | "release" | "validator" | "benchmark";
  claim: string;
  evidence: string[];
  validatorSummary: string;
  outcome: "passed" | "failed" | "blocked";
  rollbackPlan: string;
};

export function createProofEntry(input: Omit<ProofLedgerEntry, "id" | "timestamp">): ProofLedgerEntry {
  return {
    ...input,
    id: `proof_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
    timestamp: new Date().toISOString(),
  };
}
