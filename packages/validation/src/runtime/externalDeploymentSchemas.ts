export type IntegrationServiceStatus = {
  service: string;
  required: boolean;
  executed: boolean;
  executionMode: "live" | "dry_run" | "not_executed";
  result: "passed" | "failed" | "skipped";
  reason: string;
};

export type IntegrationContract = {
  schemaVersion: "1.0";
  domainId: string;
  integrationContractId: string;
  deploymentTarget: string;
  requiredServices: string[];
  optionalServices: string[];
  requiredEnvVars: string[];
  optionalEnvVars: string[];
  requiredSecrets: string[];
  optionalSecrets: string[];
  services: IntegrationServiceStatus[];
  launchCaveat: string;
  generatedAt: string;
};

export type DryRunStatus = {
  attempted: boolean;
  command: string | null;
  status: "passed" | "failed" | "skipped";
  reason: string;
};

export type DeploymentReadiness = {
  schemaVersion: "1.0";
  domainId: string;
  deploymentTarget: string;
  deploymentInstructionsPath: string;
  envManifestPath: string | null;
  envManifestPresent: boolean;
  requiredEnvVarsPresent: boolean;
  requiredEnvVarsMissing: string[];
  fakeIntegrationScanPassed: boolean;
  fakeIntegrationScanIssues: string[];
  secretScanPassed: boolean;
  secretScanIssues: string[];
  dryRunStatus: DryRunStatus;
  externalServicesNotExecuted: Array<{ service: string; reason: string }>;
  externalExecutionJustified: boolean;
  deploymentReadinessStatus: "passed" | "failed";
  launchCaveat: string;
  generatedAt: string;
};

export function validateIntegrationContractSchema(contract: any): { ok: boolean; issues: string[] } {
  const issues: string[] = [];

  if (contract?.schemaVersion !== "1.0") issues.push("integrationContract.schemaVersion must be 1.0");
  if (typeof contract?.domainId !== "string" || !contract.domainId) issues.push("integrationContract.domainId missing");
  if (typeof contract?.integrationContractId !== "string" || !contract.integrationContractId) issues.push("integrationContract.integrationContractId missing");
  if (typeof contract?.deploymentTarget !== "string" || !contract.deploymentTarget) issues.push("integrationContract.deploymentTarget missing");
  if (!Array.isArray(contract?.requiredServices)) issues.push("integrationContract.requiredServices must be array");
  if (!Array.isArray(contract?.optionalServices)) issues.push("integrationContract.optionalServices must be array");
  if (!Array.isArray(contract?.requiredEnvVars)) issues.push("integrationContract.requiredEnvVars must be array");
  if (!Array.isArray(contract?.optionalEnvVars)) issues.push("integrationContract.optionalEnvVars must be array");
  if (!Array.isArray(contract?.requiredSecrets)) issues.push("integrationContract.requiredSecrets must be array");
  if (!Array.isArray(contract?.optionalSecrets)) issues.push("integrationContract.optionalSecrets must be array");
  if (typeof contract?.launchCaveat !== "string" || !contract.launchCaveat) issues.push("integrationContract.launchCaveat missing");
  if (typeof contract?.generatedAt !== "string" || !contract.generatedAt) issues.push("integrationContract.generatedAt missing");

  if (!Array.isArray(contract?.services) || contract.services.length === 0) {
    issues.push("integrationContract.services must be non-empty array");
  } else {
    for (const svc of contract.services) {
      if (typeof svc?.service !== "string" || !svc.service) issues.push("integrationContract.services[].service missing");
      if (typeof svc?.required !== "boolean") issues.push(`integrationContract.services[${svc?.service || "?"}].required missing`);
      if (typeof svc?.executed !== "boolean") issues.push(`integrationContract.services[${svc?.service || "?"}].executed missing`);
      if (!["live", "dry_run", "not_executed"].includes(String(svc?.executionMode || ""))) {
        issues.push(`integrationContract.services[${svc?.service || "?"}].executionMode invalid`);
      }
      if (!["passed", "failed", "skipped"].includes(String(svc?.result || ""))) {
        issues.push(`integrationContract.services[${svc?.service || "?"}].result invalid`);
      }
      if (typeof svc?.reason !== "string") issues.push(`integrationContract.services[${svc?.service || "?"}].reason missing`);
      if (svc?.executed === false && String(svc?.reason || "").trim().length === 0) {
        issues.push(`integrationContract.services[${svc?.service || "?"}] missing non-execution reason`);
      }
    }
  }

  return { ok: issues.length === 0, issues };
}

export function validateDeploymentReadinessSchema(readiness: any): { ok: boolean; issues: string[] } {
  const issues: string[] = [];

  if (readiness?.schemaVersion !== "1.0") issues.push("deploymentReadiness.schemaVersion must be 1.0");
  if (typeof readiness?.domainId !== "string" || !readiness.domainId) issues.push("deploymentReadiness.domainId missing");
  if (typeof readiness?.deploymentTarget !== "string" || !readiness.deploymentTarget) issues.push("deploymentReadiness.deploymentTarget missing");
  if (typeof readiness?.deploymentInstructionsPath !== "string" || !readiness.deploymentInstructionsPath) issues.push("deploymentReadiness.deploymentInstructionsPath missing");
  if (typeof readiness?.envManifestPresent !== "boolean") issues.push("deploymentReadiness.envManifestPresent missing");
  if (typeof readiness?.requiredEnvVarsPresent !== "boolean") issues.push("deploymentReadiness.requiredEnvVarsPresent missing");
  if (!Array.isArray(readiness?.requiredEnvVarsMissing)) issues.push("deploymentReadiness.requiredEnvVarsMissing must be array");
  if (typeof readiness?.fakeIntegrationScanPassed !== "boolean") issues.push("deploymentReadiness.fakeIntegrationScanPassed missing");
  if (!Array.isArray(readiness?.fakeIntegrationScanIssues)) issues.push("deploymentReadiness.fakeIntegrationScanIssues must be array");
  if (typeof readiness?.secretScanPassed !== "boolean") issues.push("deploymentReadiness.secretScanPassed missing");
  if (!Array.isArray(readiness?.secretScanIssues)) issues.push("deploymentReadiness.secretScanIssues must be array");
  if (typeof readiness?.externalExecutionJustified !== "boolean") issues.push("deploymentReadiness.externalExecutionJustified missing");
  if (!["passed", "failed"].includes(String(readiness?.deploymentReadinessStatus || ""))) {
    issues.push("deploymentReadiness.deploymentReadinessStatus invalid");
  }
  if (typeof readiness?.launchCaveat !== "string" || !readiness.launchCaveat) issues.push("deploymentReadiness.launchCaveat missing");
  if (typeof readiness?.generatedAt !== "string" || !readiness.generatedAt) issues.push("deploymentReadiness.generatedAt missing");

  const dry = readiness?.dryRunStatus;
  if (typeof dry !== "object" || dry === null) {
    issues.push("deploymentReadiness.dryRunStatus missing");
  } else {
    if (typeof dry?.attempted !== "boolean") issues.push("deploymentReadiness.dryRunStatus.attempted missing");
    if (!["passed", "failed", "skipped"].includes(String(dry?.status || ""))) issues.push("deploymentReadiness.dryRunStatus.status invalid");
    if (typeof dry?.reason !== "string") issues.push("deploymentReadiness.dryRunStatus.reason missing");
  }

  const notExec = readiness?.externalServicesNotExecuted;
  if (!Array.isArray(notExec)) {
    issues.push("deploymentReadiness.externalServicesNotExecuted must be array");
  } else {
    for (const item of notExec) {
      if (typeof item?.service !== "string" || !item.service) issues.push("deploymentReadiness.externalServicesNotExecuted[].service missing");
      if (typeof item?.reason !== "string" || !item.reason.trim()) issues.push("deploymentReadiness.externalServicesNotExecuted[].reason missing");
    }
  }

  return { ok: issues.length === 0, issues };
}
