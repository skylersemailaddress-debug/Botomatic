import { createHash } from "crypto";
import { BuildContract, MasterSpec } from "./specModel";
import { computeBuildBlockStatus } from "./specCompleteness";

// ── Deterministic spec hashing (N24, 03.5) ───────────────────────────────────
// Same inputs → same hash. Used for drift detection and IBC reproducibility.
function hashSpec(spec: MasterSpec): string {
  const canonical = JSON.stringify({
    appName: spec.appName,
    appType: spec.appType,
    roles:               [...spec.roles].sort(),
    dataEntities:        [...spec.dataEntities].sort(),
    workflows:           [...spec.workflows].sort(),
    integrations:        [...spec.integrations].sort(),
    authModel:           spec.authModel,
    tenancyModel:        spec.tenancyModel,
    payments:            [...spec.payments].sort(),
    complianceRequirements: [...spec.complianceRequirements].sort(),
    deploymentTarget:    spec.deploymentTarget,
  });
  return createHash("sha256").update(canonical).digest("hex").slice(0, 20);
}

function hashInputs(request: string): string {
  return createHash("sha256").update(request.trim().toLowerCase()).digest("hex").slice(0, 20);
}

export function generateBuildContract(projectId: string, spec: MasterSpec, requestText?: string): BuildContract {
  const now = new Date().toISOString();
  const block = computeBuildBlockStatus(spec, true, false);
  const specHash   = hashSpec(spec);
  const inputsHash = requestText ? hashInputs(requestText) : undefined;
  const contractId = `ibc_${specHash}`;

  return {
    id: `contract_${projectId}_${Date.now()}`,
    specHash,
    inputsHash,
    contractId,
    projectId,
    appSummary: `${spec.appName}: ${spec.coreOutcome}`,
    targetUsers: spec.targetUsers,
    businessModel: spec.businessModel,
    pages: spec.pages,
    roles: spec.roles,
    permissions: spec.permissions,
    dataModel: {
      entities: spec.dataEntities,
      relationships: spec.relationships,
    },
    workflows: spec.workflows,
    integrations: spec.integrations,
    payments: spec.payments,
    notifications: spec.notifications,
    adminTools: spec.adminTools,
    authRbac: `${spec.authModel}; roles=${spec.roles.join(", ")}`,
    deploymentTarget: spec.deploymentTarget,
    complianceSecurity: [...spec.securityRequirements, ...spec.complianceRequirements],
    brandUiDirection: `${spec.brandDirection}; ${spec.uiStyle}`,
    acceptanceCriteria: spec.acceptanceCriteria,
    launchCriteria: spec.launchCriteria,
    assumptions: spec.assumptions,
    excludedItems: spec.excludedItems,
    risks: spec.risks,
    unresolvedQuestions: spec.openQuestions,
    readinessScore: spec.readinessScore,
    readyToBuild: !block.blocked,
    blockers: block.blockers,
    createdAt: now,
    updatedAt: now,
  };
}

export function approveBuildContract(contract: BuildContract, actorId: string): BuildContract {
  return {
    ...contract,
    approvedAt: new Date().toISOString(),
    approvedBy: actorId,
    updatedAt: new Date().toISOString(),
  };
}
