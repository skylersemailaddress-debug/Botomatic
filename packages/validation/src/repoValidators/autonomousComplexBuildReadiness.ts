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
    name: "Validate-Botomatic-AutonomousComplexBuildReadiness",
    status: ok ? "passed" : "failed",
    summary,
    checks,
  };
}

export function validateAutonomousComplexBuildReadiness(root: string): RepoValidatorResult {
  const requiredPackageFiles = [
    "packages/autonomous-build/src/specIngestion.ts",
    "packages/autonomous-build/src/milestonePlanner.ts",
    "packages/autonomous-build/src/buildOrchestrator.ts",
    "packages/autonomous-build/src/checkpointStore.ts",
    "packages/autonomous-build/src/autonomousRepairLoop.ts",
    "packages/autonomous-build/src/blockerClassifier.ts",
    "packages/autonomous-build/src/humanEscalationPolicy.ts",
    "packages/autonomous-build/src/finalReleaseAssembler.ts",
    "packages/autonomous-build/src/index.ts",
  ];

  const checks = [
    ...requiredPackageFiles,
    "release-evidence/runtime/autonomous_complex_build_readiness_proof.json",
    "apps/orchestrator-api/src/server_app.ts",
    "apps/control-plane/src/components/overview/AutonomousBuildRunPanel.tsx",
  ];

  for (const rel of checks) {
    if (!has(root, rel)) {
      return result(false, `Missing required autonomous complex build component: ${rel}`, checks);
    }
  }

  const orchestratorCode = read(root, "packages/autonomous-build/src/buildOrchestrator.ts");
  const plannerCode = read(root, "packages/autonomous-build/src/milestonePlanner.ts");
  const escalationCode = read(root, "packages/autonomous-build/src/humanEscalationPolicy.ts");

  if (!plannerCode.includes("foundation_runtime") || !plannerCode.includes("final_release_proof")) {
    return result(false, "Milestone planner does not declare required milestone decomposition.", checks);
  }

  if (!orchestratorCode.includes("resumeAutonomousBuildRun") || !orchestratorCode.includes("processMilestones")) {
    return result(false, "Autonomous orchestrator/resume model is incomplete.", checks);
  }

  if (!escalationCode.includes("missing_secrets") || !escalationCode.includes("live_deployment_approval")) {
    return result(false, "Human escalation policy does not cover required high-risk blocker categories.", checks);
  }

  let proof: any;
  try {
    proof = JSON.parse(read(root, "release-evidence/runtime/autonomous_complex_build_readiness_proof.json"));
  } catch {
    return result(false, "Autonomous complex build readiness proof is malformed JSON.", checks);
  }

  if (proof?.status !== "passed") return result(false, "Proof status is not passed.", checks);
  if (proof?.specIngestion !== true) return result(false, "Proof must assert specIngestion=true.", checks);
  if (proof?.milestoneGraphCreated !== true) return result(false, "Proof must assert milestoneGraphCreated=true.", checks);
  if (proof?.autonomousExecutionPlanCreated !== true) return result(false, "Proof must assert autonomousExecutionPlanCreated=true.", checks);
  if (proof?.checkpointResumeReady !== true) return result(false, "Proof must assert checkpointResumeReady=true.", checks);
  if (proof?.repairLoopReady !== true) return result(false, "Proof must assert repairLoopReady=true.", checks);
  if (proof?.humanEscalationPolicyReady !== true) return result(false, "Proof must assert humanEscalationPolicyReady=true.", checks);
  if (proof?.finalReleaseAssemblerReady !== true) return result(false, "Proof must assert finalReleaseAssemblerReady=true.", checks);
  if (proof?.oneClickLaunchPackageRequired !== true) return result(false, "Proof must assert oneClickLaunchPackageRequired=true.", checks);
  if (proof?.secretsBlockLiveExecution !== true) return result(false, "Proof must assert secretsBlockLiveExecution=true.", checks);
  if (proof?.lowRiskAutonomyEnabled !== true) return result(false, "Proof must assert lowRiskAutonomyEnabled=true.", checks);
  if (proof?.highRiskEscalationEnabled !== true) return result(false, "Proof must assert highRiskEscalationEnabled=true.", checks);

  const caveat = String(proof?.caveat || "").toLowerCase();
  if (!caveat.includes("readiness proof") || !caveat.includes("not a claim")) {
    return result(false, "Proof caveat is missing required readiness-only language.", checks);
  }

  if (proof?.noLiveDeploymentClaim !== true) {
    return result(false, "Proof must explicitly declare noLiveDeploymentClaim=true.", checks);
  }

  return result(
    true,
    "Autonomous complex build readiness is present: ingestion, milestone planning, checkpoint/resume, autonomous repair loop, high-risk escalation policy, and final release assembler are wired with readiness proof and no live-deployment claim.",
    checks
  );
}
