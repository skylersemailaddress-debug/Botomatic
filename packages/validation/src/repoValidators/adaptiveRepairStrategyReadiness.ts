import fs from "fs";
import path from "path";
import type { RepoValidatorResult } from "../repoValidators";

function has(root: string, rel: string): boolean {
  return fs.existsSync(path.join(root, rel));
}

function read(root: string, rel: string): string {
  return fs.readFileSync(path.join(root, rel), "utf8");
}

function result(ok: boolean, summary: string, checks: string[]): RepoValidatorResult {
  return {
    name: "Validate-Botomatic-AdaptiveRepairStrategyReadiness",
    status: ok ? "passed" : "failed",
    summary,
    checks,
  };
}

export function validateAdaptiveRepairStrategyReadiness(root: string): RepoValidatorResult {
  const checks = [
    "packages/autonomous-build/src/repairStrategyRegistry.ts",
    "packages/autonomous-build/src/adaptiveStrategySelector.ts",
    "packages/autonomous-build/src/adaptiveRepairMemory.ts",
    "packages/autonomous-build/src/autonomousRepairLoop.ts",
    "apps/control-plane/src/components/chat/chatCommandExecutor.ts",
    "apps/control-plane/src/components/chat/nextBestAction.ts",
    "apps/control-plane/src/components/overview/BuildStatusRail.tsx",
    "release-evidence/runtime/adaptive_repair_strategy_proof.json",
  ];

  for (const rel of checks) {
    if (!has(root, rel)) {
      return result(false, `Adaptive repair strategy component missing: ${rel}`, checks);
    }
  }

  const registry = read(root, "packages/autonomous-build/src/repairStrategyRegistry.ts");
  const selector = read(root, "packages/autonomous-build/src/adaptiveStrategySelector.ts");
  const memory = read(root, "packages/autonomous-build/src/adaptiveRepairMemory.ts");
  const loop = read(root, "packages/autonomous-build/src/autonomousRepairLoop.ts");
  const chat = read(root, "apps/control-plane/src/components/chat/chatCommandExecutor.ts");

  const requiredStrategies = [
    "add_missing_file",
    "fix_import_or_export",
    "repair_schema_mismatch",
    "complete_launch_capsule",
    "replace_placeholder_output",
    "apply_safe_default_assumption",
    "split_large_input",
    "reduce_concurrency_and_resume",
    "clean_port_and_restart",
    "route_to_vault_setup",
    "stop_for_builder_defect",
  ];

  if (!registry.includes("REPAIR_STRATEGY_REGISTRY")) {
    return result(false, "Strategy registry missing.", checks);
  }
  if (!requiredStrategies.every((id) => registry.includes(`\"${id}\"`))) {
    return result(false, "Required initial adaptive strategies are missing from registry.", checks);
  }
  if (!selector.includes("selectAdaptiveRepairStrategy")) {
    return result(false, "Strategy selection engine is missing.", checks);
  }
  if (!memory.includes("recordAdaptiveRepairOutcome") || !loop.includes("recordAdaptiveRepairOutcome")) {
    return result(false, "Adaptive memory/outcome recording is missing.", checks);
  }
  if (!selector.includes("failed_for_same_signature") || !selector.includes("already_attempted_for_same_signature")) {
    return result(false, "Failed strategy suppression for same signature is missing.", checks);
  }
  if (!selector.includes("high_risk_requires_approval")) {
    return result(false, "High-risk strategy approval gate is missing.", checks);
  }
  if (!selector.includes("botomatic_source_requires_self_upgrade_approval")) {
    return result(false, "botomatic_source self-upgrade approval gate is missing.", checks);
  }
  if (!registry.includes("never request plaintext secrets in chat") || !chat.includes("Need your decision?")) {
    return result(false, "Missing-secret handling may request plaintext secrets or missing required chat fields.", checks);
  }

  let proof: any;
  try {
    proof = JSON.parse(read(root, "release-evidence/runtime/adaptive_repair_strategy_proof.json"));
  } catch {
    return result(false, "Adaptive strategy proof artifact is missing or malformed JSON.", checks);
  }

  const proofOk =
    proof?.status === "passed" &&
    Array.isArray(proof?.strategiesRegistered) &&
    Array.isArray(proof?.selectionRules) &&
    Array.isArray(proof?.sampleSimulatedFailures) &&
    proof?.noHighRiskAutoRepairProof === true &&
    proof?.noBotomaticSourceAutoRepairProof === true &&
    proof?.missingSecretRoutesToVaultProof === true &&
    proof?.repeatedSameSignatureStrategySuppressionProof === true;

  if (!proofOk) {
    return result(false, "Adaptive strategy proof artifact is present but missing required assertions/shape.", checks);
  }

  const adaptiveChatFields = [
    "Failure signature:",
    "Recommended strategy:",
    "Why this strategy:",
    "Rejected strategies:",
    "Prior similar outcomes:",
    "Validation after repair:",
    "Rollback:",
  ];

  if (!adaptiveChatFields.every((field) => chat.includes(field))) {
    return result(false, "Adaptive next-best-action chat fields are missing.", checks);
  }

  if (!selector.includes("findSimilarAdaptiveOutcomes") || !selector.includes("summarizeStrategyOutcomesForSignature")) {
    return result(false, "Adaptive memory is not used in selection.", checks);
  }

  return result(
    true,
    "Adaptive repair strategy readiness is present: registry, selection engine, memory/outcome recording, safety gates, adaptive chat fields, and proof artifact all pass fail-closed checks.",
    checks
  );
}
