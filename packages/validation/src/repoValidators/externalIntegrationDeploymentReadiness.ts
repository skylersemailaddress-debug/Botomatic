import fs from "fs";
import path from "path";
import type { RepoValidatorResult } from "../repoValidators";

const REQUIRED_DOMAINS = [
  "web_saas_app",
  "marketing_website",
  "api_service",
  "mobile_app",
  "bot",
  "ai_agent",
  "game",
  "dirty_repo_completion",
];

function has(root: string, rel: string): boolean {
  return fs.existsSync(path.join(root, rel));
}

function read(root: string, rel: string): string {
  return fs.readFileSync(path.join(root, rel), "utf8");
}

function resolveEvidencePath(root: string, proofPath: string): string {
  if (fs.existsSync(proofPath)) return proofPath;
  if (proofPath.startsWith("/workspaces/")) {
    const normalized = proofPath.replace(/^\/workspaces\//, "/workspace/");
    if (fs.existsSync(normalized)) return normalized;
  }
  if (proofPath.startsWith("/workspaces/Botomatic/")) {
    const rel = proofPath.replace("/workspaces/Botomatic/", "");
    const joined = path.join(root, rel);
    if (fs.existsSync(joined)) return joined;
  }
  return proofPath;
}

function result(ok: boolean, summary: string, checks: string[]): RepoValidatorResult {
  return {
    name: "Validate-Botomatic-ExternalIntegrationDeploymentReadiness",
    status: ok ? "passed" : "failed",
    summary,
    checks,
  };
}

export function validateExternalIntegrationDeploymentReadiness(root: string): RepoValidatorResult {
  const checks = [
    "release-evidence/runtime/external_integration_deployment_readiness_proof.json",
  ];

  if (!checks.every((p) => has(root, p))) {
    return result(
      false,
      "External integration/deployment readiness proof is missing. Run npm run -s proof:external-deployment-readiness.",
      checks
    );
  }

  let proof: any;
  try {
    proof = JSON.parse(read(root, "release-evidence/runtime/external_integration_deployment_readiness_proof.json"));
  } catch {
    return result(false, "External integration/deployment readiness proof JSON is invalid.", checks);
  }

  const domainResults = Array.isArray(proof?.domainResults) ? proof.domainResults : [];
  const hasAllDomains = REQUIRED_DOMAINS.every((id) => domainResults.some((d: any) => d?.domainId === id));

  const domainChecksOk = REQUIRED_DOMAINS.every((id) => {
    const d = domainResults.find((item: any) => item?.domainId === id);
    if (!d) return false;

    if (typeof d?.emittedPath !== "string" || !d.emittedPath) return false;
    const emittedPath = resolveEvidencePath(root, d.emittedPath);
    if (!fs.existsSync(emittedPath)) return false;
    if (!Array.isArray(d?.externalServicesRequired)) return false;
    if (!Array.isArray(d?.optionalServices)) return false;
    if (!Array.isArray(d?.environmentVariablesRequired)) return false;
    if (typeof d?.deploymentTarget !== "string" || !d.deploymentTarget) return false;
    if (typeof d?.deploymentInstructionsPath !== "string" || !d.deploymentInstructionsPath) return false;
    if (typeof d?.integrationContractPath !== "string" || !d.integrationContractPath) return false;
    if (typeof d?.deploymentReadinessPath !== "string" || !d.deploymentReadinessPath) return false;

    const deployPath = path.join(emittedPath, d.deploymentInstructionsPath);
    const contractPath = path.join(emittedPath, d.integrationContractPath);
    const readinessPath = path.join(emittedPath, d.deploymentReadinessPath);
    if (!fs.existsSync(deployPath) || !fs.existsSync(contractPath) || !fs.existsSync(readinessPath)) return false;

    if (d?.deploymentInstructionsPresent !== true) return false;
    if (d?.integrationContractSchemaValid !== true) return false;
    if (d?.deploymentReadinessSchemaValid !== true) return false;

    if (typeof d?.fakeIntegrationScanResult?.passed !== "boolean") return false;
    if (d.fakeIntegrationScanResult.passed !== true) return false;
    if (typeof d?.secretScanResult?.passed !== "boolean") return false;
    if (d.secretScanResult.passed !== true) return false;

    if (!Array.isArray(d?.requiredEnvVarsMissing)) return false;
    if (d.requiredEnvVarsMissing.length > 0) return false;

    if (!Array.isArray(d?.externalServicesNotExecuted)) return false;
    const undocumentedNotExecuted = d.externalServicesNotExecuted.some((item: any) =>
      typeof item?.service !== "string" ||
      !item.service ||
      typeof item?.reason !== "string" ||
      !item.reason.trim()
    );
    if (undocumentedNotExecuted) return false;

    const dry = d?.dryRunStatus;
    if (typeof dry !== "object" || dry === null) return false;
    if (typeof dry?.attempted !== "boolean") return false;
    if (!["passed", "failed", "skipped"].includes(String(dry?.status || ""))) return false;

    if (d?.deploymentReadinessStatus !== "passed") return false;
    if (typeof d?.launchCaveat !== "string" || !d.launchCaveat.trim()) return false;

    return true;
  });

  const proofOk =
    proof?.pathId === "external_integration_deployment_readiness" &&
    proof?.status === "passed" &&
    proof?.requiredDomainPresence === true &&
    Number(proof?.failedDomainCount || 0) === 0;

  const ok = hasAllDomains && domainChecksOk && proofOk;

  return result(
    ok,
    ok
      ? "External integration and deployment readiness evidence is complete, machine-readable, and fail-closed across required domains."
      : "External integration/deployment readiness failed closed (missing domain evidence, malformed schema, undocumented skips, or failed readiness status).",
    checks
  );
}
