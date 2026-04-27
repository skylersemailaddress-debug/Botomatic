import { ProofLedgerEntry } from "./proofLedger";

export type ClaimVerification = {
  ok: boolean;
  blockers: string[];
};

export function verifyClaim(entry: ProofLedgerEntry): ClaimVerification {
  const blockers: string[] = [];
  if (!entry.claim.trim()) blockers.push("Claim text is missing.");
  if (!entry.evidence.length) blockers.push("Evidence references are missing.");
  if (!entry.validatorSummary.trim()) blockers.push("Validator summary is missing.");
  if (!entry.rollbackPlan.trim()) blockers.push("Rollback plan is missing.");
  if (entry.outcome !== "passed") blockers.push("Claim outcome is not passed.");
  return { ok: blockers.length === 0, blockers };
}
