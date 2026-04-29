import type { UISourceApplyResult } from "./uiSourceApply";
import type { UISourceApplyRollbackResult, UISourceApplyTransaction } from "./uiSourceApplyTransaction";

export const UI_SOURCE_APPLY_PROOF_CAVEAT = "Local apply proof verifies guarded file-write behavior only. It does not deploy, export, or prove runtime correctness.";
export type UISourceApplyProof = { transactionId: string; changedFiles: string[]; writesPerformed: number; rollbackAvailable: boolean; rollbackVerified: boolean; blockedReasons: string[]; caveat: string; mode: "dryRun"|"confirmedApply" };

export function createUISourceApplyProof(transaction: UISourceApplyTransaction, applyResult: UISourceApplyResult, rollbackResult?: UISourceApplyRollbackResult): UISourceApplyProof {
  return { transactionId: transaction.id, changedFiles: applyResult.changedFiles, writesPerformed: applyResult.writesPerformed, rollbackAvailable: transaction.beforeSnapshot.length > 0, rollbackVerified: rollbackResult?.ok === true, blockedReasons: [...new Set([...(applyResult.blockedReasons ?? []), ...(rollbackResult?.blockedReasons ?? [])])], caveat: UI_SOURCE_APPLY_PROOF_CAVEAT, mode: transaction.mode };
}

export function validateUISourceApplyProof(proof: UISourceApplyProof): { valid: boolean; issues: string[] } {
  const issues: string[] = [];
  if (!proof.transactionId) issues.push("transactionId required");
  if (!Array.isArray(proof.changedFiles)) issues.push("changedFiles required");
  if (proof.mode === "confirmedApply" && !proof.rollbackAvailable) issues.push("confirmed apply requires rollback snapshot availability");
  if (proof.caveat !== UI_SOURCE_APPLY_PROOF_CAVEAT) issues.push("proof caveat mismatch");
  return { valid: issues.length === 0, issues };
}
