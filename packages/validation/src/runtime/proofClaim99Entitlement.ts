import fs from "fs";
import path from "path";

type RequirementId =
  | "exhaustive_domain_proof"
  | "live_deployment_proven_all_declared_providers"
  | "autobuild_99_statistical_threshold"
  | "independent_verification_audit";

type Requirement = {
  id: RequirementId;
  requiredEvidenceClass: string;
  evidencePath: string;
  satisfied: boolean;
  details: string;
};

type Claim99EntitlementProof = {
  status: "blocked" | "eligible";
  claimId: "fully_built_live_and_autobuild_99_percent_of_supported_scope";
  entitled: boolean;
  requirements: Requirement[];
  unmetRequirements: RequirementId[];
  generatedAt: string;
  caveat: string;
};

function has(filePath: string): boolean {
  return fs.existsSync(filePath);
}

function loadJson(filePath: string): any | null {
  try {
    return JSON.parse(fs.readFileSync(filePath, "utf8"));
  } catch {
    return null;
  }
}

function writeJson(filePath: string, value: unknown) {
  fs.mkdirSync(path.dirname(filePath), { recursive: true });
  fs.writeFileSync(filePath, JSON.stringify(value, null, 2));
}

function run() {
  const root = process.cwd();
  const runtimeDir = path.join(root, "release-evidence", "runtime");
  const maxPowerPath = path.join(runtimeDir, "max_power_completion_proof.json");
  const liveDeploymentExecutionPath = path.join(runtimeDir, "live_deployment_provider_execution_proof.json");
  const autobuild99StatsPath = path.join(runtimeDir, "autobuild_99_statistical_proof.json");
  const independentAuditPath = path.join(runtimeDir, "claim_99_independent_audit.json");
  const outPath = path.join(runtimeDir, "claim_99_entitlement_proof.json");

  const maxPower = loadJson(maxPowerPath);
  const liveDeploymentExecution = loadJson(liveDeploymentExecutionPath);
  const autobuildStats = loadJson(autobuild99StatsPath);
  const independentAudit = loadJson(independentAuditPath);

  const exhaustiveDomainSatisfied =
    maxPower !== null &&
    String(maxPower?.status) === "max_power_complete" &&
    maxPower?.exhaustiveDomainProven === true;

  const liveDeploymentSatisfied =
    liveDeploymentExecution !== null &&
    String(liveDeploymentExecution?.status) === "passed" &&
    liveDeploymentExecution?.allProvidersLiveProven === true &&
    Number(liveDeploymentExecution?.requiredProviderCount || 0) > 0 &&
    Number(liveDeploymentExecution?.coveredProviderCount || 0) === Number(liveDeploymentExecution?.requiredProviderCount || 0) &&
    Array.isArray(liveDeploymentExecution?.providers) &&
    liveDeploymentExecution.providers.every(
      (provider: any) =>
        provider?.liveExecutionPerformed === true &&
        provider?.usedRealCredentials === true &&
        provider?.calledRealProviderApis === true &&
        provider?.smokeTestsPassed === true &&
        provider?.rollbackVerified === true
    );

  const autobuild99Satisfied =
    autobuildStats !== null &&
    String(autobuildStats?.status) === "passed" &&
    Number(autobuildStats?.lowerConfidenceBound || 0) >= 0.99 &&
    Number(autobuildStats?.evaluatedCaseCount || 0) >= 1000 &&
    autobuildStats?.frozenCorpus === true;

  const independentAuditSatisfied =
    independentAudit !== null &&
    String(independentAudit?.status) === "signed_off" &&
    independentAudit?.claimId === "fully_built_live_and_autobuild_99_percent_of_supported_scope";

  const requirements: Requirement[] = [
    {
      id: "exhaustive_domain_proof",
      requiredEvidenceClass: "exhaustive-domain-proven",
      evidencePath: "release-evidence/runtime/max_power_completion_proof.json",
      satisfied: exhaustiveDomainSatisfied,
      details: exhaustiveDomainSatisfied
        ? "Max-power completion proof is eligible for exhaustive-domain language."
        : "Exhaustive-domain completion is not proven in the max-power proof artifact.",
    },
    {
      id: "live_deployment_proven_all_declared_providers",
      requiredEvidenceClass: "live-deployment-proven",
      evidencePath: "release-evidence/runtime/live_deployment_provider_execution_proof.json",
      satisfied: liveDeploymentSatisfied,
      details: liveDeploymentSatisfied
        ? "Live deployment evidence is present with real provider execution and credentials."
        : "Live deployment proof across declared providers is not yet present; readiness-only evidence is not sufficient.",
    },
    {
      id: "autobuild_99_statistical_threshold",
      requiredEvidenceClass: "runtime-proven + exhaustive-domain-proven",
      evidencePath: "release-evidence/runtime/autobuild_99_statistical_proof.json",
      satisfied: autobuild99Satisfied,
      details: autobuild99Satisfied
        ? "Autobuild 99% threshold is proven with confidence bounds on a frozen corpus."
        : "99% autobuild threshold is not yet independently proven with a confidence bound on a frozen corpus.",
    },
    {
      id: "independent_verification_audit",
      requiredEvidenceClass: "independent-audit-signoff",
      evidencePath: "release-evidence/runtime/claim_99_independent_audit.json",
      satisfied: independentAuditSatisfied,
      details: independentAuditSatisfied
        ? "Independent audit signed off the 99% claim basis."
        : "Independent audit sign-off artifact is missing or not signed off.",
    },
  ];

  const unmetRequirements = requirements.filter((r) => !r.satisfied).map((r) => r.id);
  const entitled = unmetRequirements.length === 0;

  const proof: Claim99EntitlementProof = {
    status: entitled ? "eligible" : "blocked",
    claimId: "fully_built_live_and_autobuild_99_percent_of_supported_scope",
    entitled,
    requirements,
    unmetRequirements,
    generatedAt: new Date().toISOString(),
    caveat: entitled
      ? "99% claim entitlement is active while evidence remains current and validators stay green."
      : "Fail-closed: 99% claim entitlement is blocked until all required live/statistical/audit evidence classes are satisfied.",
  };

  writeJson(outPath, proof);

  const maxPowerExists = has(maxPowerPath);
  const liveExecutionExists = has(liveDeploymentExecutionPath);
  console.log(
    `Claim 99 entitlement proof updated: status=${proof.status} entitled=${proof.entitled} unmet=${proof.unmetRequirements.length} maxPowerExists=${maxPowerExists} liveExecutionExists=${liveExecutionExists}`
  );
}

run();
