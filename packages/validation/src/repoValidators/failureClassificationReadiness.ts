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
    name: "Validate-Botomatic-FailureClassificationReadiness",
    status: ok ? "passed" : "failed",
    summary,
    checks,
  };
}

export function validateFailureClassificationReadiness(root: string): RepoValidatorResult {
  const checks = [
    "packages/autonomous-build/src/failurePolicy.ts",
    "packages/autonomous-build/src/autonomousRepairLoop.ts",
    "packages/autonomous-build/src/checkpointStore.ts",
    "packages/autonomous-build/src/buildOrchestrator.ts",
    "apps/control-plane/src/components/chat/chatCommandExecutor.ts",
    "apps/control-plane/src/components/chat/nextBestAction.ts",
    "apps/control-plane/src/components/overview/BuildStatusRail.tsx",
  ];

  for (const rel of checks) {
    if (!has(root, rel)) {
      return result(false, `Failure classification readiness component missing: ${rel}`, checks);
    }
  }

  const policy = read(root, "packages/autonomous-build/src/failurePolicy.ts");
  const loop = read(root, "packages/autonomous-build/src/autonomousRepairLoop.ts");
  const checkpoint = read(root, "packages/autonomous-build/src/checkpointStore.ts");
  const orchestrator = read(root, "packages/autonomous-build/src/buildOrchestrator.ts");
  const chat = read(root, "apps/control-plane/src/components/chat/chatCommandExecutor.ts");

  const requiredCategories = [
    "generated_app_implementation_failure",
    "build_contract_ambiguity",
    "botomatic_builder_defect",
    "missing_human_decision",
    "missing_secret_or_credential",
    "external_provider_unavailable",
    "validation_contract_failure",
    "resource_limit_failure",
  ];

  if (!requiredCategories.every((category) => policy.includes(`\"${category}\"`))) {
    return result(false, "Failure taxonomy module is missing one or more required categories.", checks);
  }

  const inspectionFields = [
    "runId:",
    "milestoneId:",
    "failureCategory:",
    "confidence:",
    "evidence:",
    "lastError:",
    "failingCommand:",
    "affectedFiles:",
    "affectedSubsystem:",
    "safeRepairAvailable:",
    "recommendedRepair:",
    "escalationRequired:",
    "userQuestion",
    "resumeCommand:",
    "validationCommandAfterRepair:",
  ];

  if (!inspectionFields.every((field) => policy.includes(field))) {
    return result(false, "Failure inspection contract is missing required fields.", checks);
  }

  if (!policy.includes("evaluateRepairPolicy") || !policy.includes("maxAttemptsPerMilestone") || !policy.includes("autoRepairAllowed")) {
    return result(false, "Repair policy engine is missing or incomplete.", checks);
  }

  if (!policy.includes("createFailureSignature") || !checkpoint.includes("repairAttemptsBySignature") || !orchestrator.includes("repairAttemptsBySignature")) {
    return result(false, "Repair budget/signature tracking is not wired by signature.", checks);
  }

  if (
    !policy.includes('classification.category === "botomatic_builder_defect"') ||
    !policy.includes("autoRepairAllowed: false") ||
    !policy.includes("require approval before self-upgrade")
  ) {
    return result(false, "botomatic_builder_defect policy may auto-repair without approval.", checks);
  }

  if (
    !policy.includes('classification.category === "missing_secret_or_credential"') ||
    !policy.includes("do not paste plaintext secrets into chat")
  ) {
    return result(false, "missing_secret_or_credential does not enforce non-plaintext secret handling via Vault guidance.", checks);
  }

  if (
    !policy.includes("repairBudgetExhausted") ||
    !policy.includes("whatFailed") ||
    !policy.includes("attemptedRepairs") ||
    !policy.includes("whyRepairsFailed") ||
    !policy.includes("exactNextAction") ||
    !loop.includes("repair_budget_exhausted")
  ) {
    return result(false, "repair_budget_exhausted does not include evidence, attempted repairs, failure reason, and exact next action.", checks);
  }

  if (!policy.includes('classification.category === "resource_limit_failure"') || !policy.includes("port cleanup") || !policy.includes("reduced concurrency")) {
    return result(false, "resource_limit_failure handling policy is missing required mitigation guidance.", checks);
  }

  if (
    !policy.includes('classification.category === "generated_app_implementation_failure"') ||
    !policy.includes("isGeneratedOrLaunchCapsulePath") ||
    !policy.includes("autoRepairAllowed: safeTargets")
  ) {
    return result(false, "generated_app_implementation_failure auto-repair policy is not limited to generated output/launch capsule files.", checks);
  }

  const chatEnvelopeFields = [
    "Current state:",
    "Failed milestone:",
    "Failure category:",
    "Evidence:",
    "What I already tried:",
    "Recommended next action:",
    "Risk:",
    "Command I will run:",
    "Need your decision?",
  ];
  if (!chatEnvelopeFields.every((field) => chat.includes(field))) {
    return result(false, "Chat failure response envelope is missing required fields.", checks);
  }

  return result(
    true,
    "Failure classification readiness is wired: taxonomy, inspection contract, policy engine, signature-aware repair budget, safe secret handling guidance, and chat explanation envelope are present.",
    checks
  );
}
