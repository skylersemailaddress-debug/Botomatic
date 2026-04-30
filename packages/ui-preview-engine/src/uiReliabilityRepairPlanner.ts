import crypto from "crypto";
import { UI_REPAIR_PLAN_CAVEAT, type UIRepairFailureClassification, type UIRepairPlanResult, type UIRepairStrategy } from "./uiReliabilityRepairModel";

const STRATEGY_BY_KIND: Record<string, Omit<UIRepairStrategy, "strategyId"|"failureKind">> = {
  "parse-error": { label: "reparse-and-minimal-syntax-patch", requiresSourcePatchPlan: true },
  "type-error": { label: "type-safe-prop/import-adjustment", requiresSourcePatchPlan: true },
  "build-error": { label: "build-log-guided-plan", requiresSourcePatchPlan: true },
  "test-error": { label: "test-guided-plan", requiresSourcePatchPlan: true, risky: true },
  "lint-error": { label: "lint-format-plan", requiresSourcePatchPlan: true },
  "source-identity-stale": { label: "refresh-identity-and-replan", requiresSourcePatchPlan: true },
  "patch-conflict": { label: "recompute-before-snippet-and-replan", requiresSourcePatchPlan: true },
  "missing-file": { label: "regenerate-missing-reference-or-block", requiresSourcePatchPlan: true, risky: true },
  "unsafe-operation": { label: "rollback-only/manual-review", rollbackOnly: true, risky: true },
  "unknown": { label: "manual-review", rollbackOnly: true, risky: true }
};

export function createUIReliabilityRepairPlan(args: { failureClassifications: UIRepairFailureClassification[]; sourcePatchPlan?: { operations?: { operationId?: string; targetFilePath?: string }[] }; sourceRoundTripResult?: unknown; transactionRollbackProof?: { transactionId?: string; rollbackVerified?: boolean }; fullProjectGenerationPlan?: unknown; dataStateApiWiringPlan?: unknown; options?: { maxAttempts?: number; currentAttemptIndex?: number; allowRiskyRepairs?: boolean; outputMode?: "previewMetadata"|"sourcePatchPlan"|"rollbackOnly"|"unknown" } }): UIRepairPlanResult {
  const maxAttempts = Math.max(1, args.options?.maxAttempts ?? 3);
  const currentAttemptIndex = Math.max(0, args.options?.currentAttemptIndex ?? 0);
  const outputMode = args.options?.outputMode ?? "previewMetadata";
  const allowRiskyRepairs = args.options?.allowRiskyRepairs === true;
  const failures = [...(args.failureClassifications ?? [])];
  const strategies = failures.map((f, i) => ({ ...STRATEGY_BY_KIND[f.kind], strategyId: `strategy-${i}-${f.kind}`, failureKind: f.kind }));
  const affectedFiles = [...new Set(failures.map((f) => f.affectedFilePath).filter(Boolean) as string[])].sort();
  const affectedNodeIds = [...new Set(failures.map((f) => f.affectedNodeId).filter(Boolean) as string[])].sort();
  const blockedReasons: string[] = [];
  let riskLevel: "low"|"medium"|"high" = failures.length ? "medium" : "low";
  let requiresManualReview = false;
  const rollbackProofRequired = outputMode === "sourcePatchPlan" && !args.transactionRollbackProof?.rollbackVerified;
  const rollbackRequired = strategies.some((s) => s.rollbackOnly) || rollbackProofRequired;
  if (currentAttemptIndex >= maxAttempts) blockedReasons.push("max attempts exceeded");
  if (rollbackProofRequired) blockedReasons.push("rollback proof required for sourcePatchPlan");
  if (outputMode === "unknown") blockedReasons.push("outputMode unknown");
  if (affectedFiles.some((f) => /^release-evidence\/runtime\//.test(f) || /(^|\/)reserved\//.test(f))) blockedReasons.push("protected/reserved path affected");
  if (!allowRiskyRepairs && strategies.some((s) => s.risky)) blockedReasons.push("risky strategies blocked when allowRiskyRepairs=false");
  if (failures.some((f) => f.kind === "unknown" || f.kind === "unsafe-operation")) blockedReasons.push("manual review required for unknown/unsafe failures");
  if (blockedReasons.length) { riskLevel = "high"; requiresManualReview = true; }
  const attempts = currentAttemptIndex >= maxAttempts ? [] : strategies.slice(0, maxAttempts-currentAttemptIndex).map((s, ix)=>({ attemptId: `attempt-${currentAttemptIndex+ix}-${s.strategyId}`, index: currentAttemptIndex+ix, strategyId: s.strategyId, blockedReasons: blockedReasons.filter(Boolean) }));
  const repairPlanId = crypto.createHash("sha256").update(JSON.stringify({ failures, strategies: strategies.map((s)=>s.label), maxAttempts, currentAttemptIndex, outputMode, rollback: args.transactionRollbackProof?.rollbackVerified === true })).digest("hex").slice(0, 16);
  const plan = { repairPlanId, failureClassifications: failures, selectedStrategies: strategies, attempts, maxAttempts, nextAttemptIndex: currentAttemptIndex >= maxAttempts ? maxAttempts : currentAttemptIndex + attempts.length, rollbackRequired, rollbackProofRequired, affectedFiles, affectedNodeIds, blockedReasons: [...new Set(blockedReasons)].sort(), riskLevel, requiresManualReview, caveat: UI_REPAIR_PLAN_CAVEAT, operationIds: (args.sourcePatchPlan?.operations ?? []).map((o)=>o.operationId).filter(Boolean) as string[], transactionIds: args.transactionRollbackProof?.transactionId ? [args.transactionRollbackProof.transactionId] : [] };
  return { ok: blockedReasons.length === 0, plan, issues: blockedReasons.map((b)=>({ code: "blocked", message: b, blocked: true })) };
}
