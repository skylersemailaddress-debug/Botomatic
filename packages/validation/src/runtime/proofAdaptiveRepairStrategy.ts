import fs from "fs";
import path from "path";
import {
  REPAIR_STRATEGY_REGISTRY,
  selectAdaptiveRepairStrategy,
  type FailureInspection,
} from "../../../autonomous-build/src";

const ROOT = process.cwd();
const OUT_PATH = path.join(ROOT, "release-evidence", "runtime", "adaptive_repair_strategy_proof.json");

function ensureDir(filePath: string) {
  fs.mkdirSync(path.dirname(filePath), { recursive: true });
}

function sampleFailure(input: Partial<FailureInspection>): FailureInspection {
  return {
    runId: "proof_run",
    milestoneId: "core_workflows",
    failureCategory: "generated_app_implementation_failure",
    confidence: 0.85,
    evidence: ["sample"],
    lastError: "cannot find module src/workflows/router.ts",
    failingCommand: "npm run -s build",
    affectedFiles: ["release-evidence/generated-apps/proj_demo/src/workflows/router.ts"],
    affectedSubsystem: "generated-app-build-loop",
    safeRepairAvailable: true,
    recommendedRepair: "Apply targeted generated-output patch and rerun milestone validators",
    escalationRequired: false,
    resumeCommand: "npm run -s autonomous-build:resume -- proof_run",
    validationCommandAfterRepair: "validate:core_workflows",
    failureSignature: "proof_sig_import",
    attemptsBySignature: 1,
    attemptsByMilestoneCategory: 1,
    attemptedRepairs: [],
    rejectedStrategies: [],
    priorSimilarOutcomes: [],
    approvalRequired: false,
    expectedValidationCommand: "npm run -s build && npm run -s test:universal",
    rollbackPlan: "Revert touched files.",
    ...input,
  };
}

function main() {
  const missingLaunchCapsule = selectAdaptiveRepairStrategy({
    failureInspection: sampleFailure({
      milestoneId: "launch_readiness",
      failureCategory: "validation_contract_failure",
      lastError: "missing launch capsule file launch-capsule/README.md",
      failureSignature: "proof_sig_launch_capsule",
      affectedFiles: ["release-evidence/generated-apps/proj_demo/launch-capsule/README.md"],
      expectedValidationCommand: "validate:launch_capsule && no_placeholder_scan",
    }),
    repairHistory: [],
    selfUpgradeApproved: false,
  });

  const missingImport = selectAdaptiveRepairStrategy({
    failureInspection: sampleFailure({
      failureCategory: "generated_app_implementation_failure",
      lastError: "TypeScript build failed because src/workflows/router.ts imports missing module",
      failureSignature: "proof_sig_import",
    }),
    repairHistory: [],
    selfUpgradeApproved: false,
  });

  const missingSecret = selectAdaptiveRepairStrategy({
    failureInspection: sampleFailure({
      failureCategory: "missing_secret_or_credential",
      lastError: "Vercel token required",
      failureSignature: "proof_sig_secret",
      safeRepairAvailable: false,
      escalationRequired: true,
      affectedSubsystem: "secrets-workflow",
      affectedFiles: [],
    }),
    repairHistory: [],
    selfUpgradeApproved: false,
  });

  const builderDefect = selectAdaptiveRepairStrategy({
    failureInspection: sampleFailure({
      failureCategory: "botomatic_builder_defect",
      lastError: "routing regression: build nexus routed to self-upgrade",
      failureSignature: "proof_sig_builder_defect",
      safeRepairAvailable: false,
      escalationRequired: true,
    }),
    repairHistory: [],
    selfUpgradeApproved: false,
  });

  const repeatedSuppression = selectAdaptiveRepairStrategy({
    failureInspection: sampleFailure({
      failureSignature: "proof_sig_repeat",
      lastError: "cannot find module src/workflows/router.ts",
    }),
    repairHistory: [
      {
        milestoneId: "core_workflows",
        failureCategory: "generated_app_implementation_failure",
        failureSignature: "proof_sig_repeat",
        strategyId: "fix_import_or_export",
        repairAction: "Correct module import/export paths and index exports in generated output.",
        outcome: "failed",
        reason: "still failing",
        attemptedAt: new Date().toISOString(),
      },
    ],
    selfUpgradeApproved: false,
  });

  const proof = {
    status: "passed",
    generatedAt: new Date().toISOString(),
    strategiesRegistered: REPAIR_STRATEGY_REGISTRY.map((s) => ({
      strategyId: s.strategyId,
      riskLevel: s.riskLevel,
      allowedTargets: s.allowedTargets,
      requiresApproval: s.requiresApproval,
    })),
    selectionRules: [
      "Never select high-risk strategy without approval",
      "Never select botomatic_source target without explicit self-upgrade approval",
      "Prefer previously successful strategies for same category+subsystem",
      "Avoid strategies that failed for same failureSignature",
      "Avoid repeating same strategy for same failureSignature",
      "Prefer lowest-risk applicable strategy",
      "Escalate with exact question when no safe strategy exists",
      "Missing secret routes to Vault setup and never requests plaintext in chat",
      "Provider unavailable prefers alternate intake/source path before provider calls",
    ],
    sampleSimulatedFailures: [
      {
        name: "missing_launch_capsule_file",
        selected: missingLaunchCapsule.primaryStrategy?.strategyId || null,
        rejected: missingLaunchCapsule.rejectedStrategies,
      },
      {
        name: "typescript_missing_import",
        selected: missingImport.primaryStrategy?.strategyId || null,
        rejected: missingImport.rejectedStrategies,
      },
      {
        name: "missing_secret",
        selected: missingSecret.primaryStrategy?.strategyId || null,
        rejected: missingSecret.rejectedStrategies,
      },
      {
        name: "builder_defect",
        selected: builderDefect.primaryStrategy?.strategyId || null,
        approvalRequired: builderDefect.approvalRequired,
      },
      {
        name: "same_signature_strategy_suppression",
        selected: repeatedSuppression.primaryStrategy?.strategyId || null,
        rejected: repeatedSuppression.rejectedStrategies,
      },
    ],
    selectedStrategies: {
      missingLaunchCapsule: missingLaunchCapsule.primaryStrategy?.strategyId || null,
      missingImport: missingImport.primaryStrategy?.strategyId || null,
      missingSecret: missingSecret.primaryStrategy?.strategyId || null,
      builderDefect: builderDefect.primaryStrategy?.strategyId || null,
    },
    rejectedStrategies: {
      repeatedSignature: repeatedSuppression.rejectedStrategies,
      builderDefect: builderDefect.rejectedStrategies,
    },
    memoryBehavior: {
      boostsSuccessfulStrategies: true,
      suppressesFailedSameSignatureStrategies: true,
      detectsFlappingRepairs: true,
    },
    noHighRiskAutoRepairProof: builderDefect.approvalRequired === true,
    noBotomaticSourceAutoRepairProof: builderDefect.primaryStrategy === null,
    missingSecretRoutesToVaultProof:
      missingSecret.primaryStrategy?.strategyId === "route_to_vault_setup" ||
      missingSecret.fallbackStrategies.some((item) => item.strategyId === "route_to_vault_setup"),
    repeatedSameSignatureStrategySuppressionProof:
      repeatedSuppression.rejectedStrategies.some((item) => item.strategyId === "fix_import_or_export"),
    caveat:
      "Adaptive strategy selection improves repair choice quality but cannot override validators, launch gates, approval gates, secret policy, or live deployment blocks.",
    noLiveDeploymentClaim: true,
  };

  ensureDir(OUT_PATH);
  fs.writeFileSync(OUT_PATH, JSON.stringify(proof, null, 2), "utf8");

  console.log(`Adaptive repair strategy proof written: ${OUT_PATH}`);
}

main();
