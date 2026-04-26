import type { AutonomousBuildRunState } from "./checkpointStore";

export type FinalReleaseBundle = {
  finalAppOutputPath: string;
  launchPackagePath: string;
  secretRequirementsPath: string;
  deploymentReadinessPath: string;
  smokeTestsPath: string;
  rollbackPlanPath: string;
  proofArtifactsPath: string;
  readmePath: string;
  runbookPath: string;
  finalReleaseEvidencePath: string;
  assembled: boolean;
};

export function assembleFinalReleaseBundle(runState: AutonomousBuildRunState): FinalReleaseBundle {
  const base = `release-evidence/generated-apps/${runState.runId}`;
  return {
    finalAppOutputPath: `${base}/app`,
    launchPackagePath: `${base}/launch`,
    secretRequirementsPath: `${base}/launch/secret-requirements.json`,
    deploymentReadinessPath: `${base}/deploy/deployment_readiness.json`,
    smokeTestsPath: `${base}/launch/SMOKE_TESTS.md`,
    rollbackPlanPath: `${base}/launch/ROLLBACK.md`,
    proofArtifactsPath: "release-evidence/runtime",
    readmePath: `${base}/README.md`,
    runbookPath: `${base}/RUNBOOK.md`,
    finalReleaseEvidencePath: "release-evidence/runtime/final_commercial_release_evidence.json",
    assembled: runState.status === "completed",
  };
}
