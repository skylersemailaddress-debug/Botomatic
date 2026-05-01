import type { DeploymentEnvironmentId, DeploymentProviderId } from "./deploymentProviderContracts";

export type LiveDeploymentExecutionIngestionRecord = {
  providerId: DeploymentProviderId;
  domainId: string;
  environment: DeploymentEnvironmentId;
  runId: string;
  liveExecutionPerformed: boolean;
  usedRealCredentials: boolean;
  calledRealProviderApis: boolean;
  smokeTestsPassed: boolean;
  rollbackVerified: boolean;
  deploymentLogRef: string;
  smokeTestLogRef: string;
  rollbackLogRef: string;
  executedAt: string;
  notes?: string;
};

export type LiveDeploymentExecutionIngestion = {
  schemaVersion: "1.0";
  claimId: "fully_built_live_and_autobuild_99_percent_of_supported_scope";
  records: LiveDeploymentExecutionIngestionRecord[];
  generatedAt: string;
  caveat: string;
};

export type LiveDeploymentProviderExecutionRecord = {
  providerId: DeploymentProviderId;
  domainId: string;
  environment: DeploymentEnvironmentId;
  liveExecutionPerformed: boolean;
  usedRealCredentials: boolean;
  calledRealProviderApis: boolean;
  smokeTestsPassed: boolean;
  rollbackVerified: boolean;
  executionEvidenceRef: string;
  smokeEvidenceRef?: string;
  rollbackEvidenceRef?: string;
  sourceRunId?: string;
  executedAt?: string;
};

export type LiveDeploymentProviderExecutionProof = {
  status: "blocked" | "in_progress" | "passed";
  claimId: "fully_built_live_and_autobuild_99_percent_of_supported_scope";
  ingestionPath: string;
  requiredProviderCount: number;
  coveredProviderCount: number;
  measurableProgressCount: number;
  progressPercent: number;
  allProvidersLiveProven: boolean;
  providers: LiveDeploymentProviderExecutionRecord[];
  ingestionIssues: string[];
  unmetRequirements: string[];
  generatedAt: string;
  caveat: string;
};
