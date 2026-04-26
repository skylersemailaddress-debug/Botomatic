export type LiveDeploymentStatus =
  | "blocked_pending_approval"
  | "blocked_missing_credentials"
  | "ready_for_approved_execution"
  | "not_executed";

export type DeploymentApprovalStatus = "not_approved" | "approved" | "expired" | "rejected";

export type LiveDeploymentExecutionContract = {
  deploymentId: string;
  projectId: string;
  domainId: string;
  providerId: string;
  deploymentTarget: string;
  credentialBindingId: string;
  approvalRequestId: string;
  preDeployChecklistId: string;
  executionPlanId: string;
  postDeploySmokeTestPlanId: string;
  rollbackPlanId: string;
  auditEventIds: string[];
  status: LiveDeploymentStatus;
  blockedByDefault: boolean;
  liveExecutionAllowed: boolean;
  liveExecutionPerformed: boolean;
  nonExecutionProof: string;
  createdAt: string;
};

export type DeploymentApprovalRequest = {
  approvalRequestId: string;
  projectId: string;
  domainId: string;
  providerId: string;
  requestedAction: string;
  riskLevel: "low" | "medium" | "high";
  requiredApprover: string;
  approvalStatus: DeploymentApprovalStatus;
  approvalRequired: boolean;
  explicitUserApprovalRequired: boolean;
  approvalEvidence: string | null;
  expiresAt: string;
  createdAt: string;
};

export type CredentialBindingContract = {
  credentialBindingId: string;
  providerId: string;
  requiredCredentialKeys: string[];
  suppliedCredentialKeys: string[];
  missingCredentialKeys: string[];
  secretStoragePolicy: string;
  plaintextSecretAllowed: false;
  credentialValidationMode: string;
  credentialValidationPerformed: false;
  credentialValidationSkippedReason: string;
  createdAt: string;
};

export type ProviderExecutionAdapterContract = {
  providerId: string;
  supportedDomains: string[];
  requiredCredentialKeys: string[];
  preflightChecks: string[];
  buildArtifactRequirements: string[];
  deployCommandTemplate: string;
  smokeTestStrategy: string;
  rollbackStrategy: string;
  liveExecutionRequiresApproval: true;
  liveExecutionBlockedByDefault: true;
  dryRunSupported: boolean;
  liveSupported: boolean;
  executionMethod: "cli_template" | "api_handoff" | "manual_handoff";
};

export type PreDeployChecklist = {
  preDeployChecklistId: string;
  domainId: string;
  providerId: string;
  buildArtifactExists: boolean;
  envManifestExists: boolean;
  credentialBindingExists: boolean;
  approvalRequestExists: boolean;
  deploymentTargetKnown: boolean;
  rollbackPlanExists: boolean;
  smokeTestPlanExists: boolean;
  noFakeIntegrationSignals: boolean;
  noCommittedSecrets: boolean;
  currentValidationStatusPass: boolean;
  status: "prepared" | "failed";
  createdAt: string;
};

export type DeploymentExecutionPlan = {
  executionPlanId: string;
  domainId: string;
  providerId: string;
  orderedSteps: string[];
  commandTemplates: string[];
  requiredCredentials: string[];
  requiredArtifacts: string[];
  preflightDependencies: string[];
  approvalDependency: string;
  smokeTestDependency: string;
  rollbackDependency: string;
  status: "blocked_pending_approval";
  liveExecutionPerformed: false;
  createdAt: string;
};

export type PostDeploySmokeTestPlan = {
  postDeploySmokeTestPlanId: string;
  domainId: string;
  providerId: string;
  healthCheckTarget: string;
  routeOrEndpointChecks: string[];
  authProtectedPathCheck: string;
  workflowSmokeCheck: string;
  integrationBoundaryCheck: string;
  expectedSuccessCriteria: string[];
  rollbackTriggerConditions: string[];
  status: "planned_not_executed";
  createdAt: string;
};

export type RollbackExecutionPlan = {
  rollbackPlanId: string;
  domainId: string;
  providerId: string;
  rollbackStrategy: string;
  rollbackTrigger: string;
  previousArtifactVersionRequirement: string;
  dataRollbackCaveat: string;
  operatorApprovalRequirement: string;
  rollbackCommandTemplateOrManualHandoff: string;
  status: "planned_not_executed";
  createdAt: string;
};

export type DeploymentAuditEvent = {
  auditEventId: string;
  domainId: string;
  providerId: string;
  eventType:
    | "live_deployment_requested"
    | "approval_required"
    | "credentials_required"
    | "preflight_prepared"
    | "execution_plan_prepared"
    | "live_execution_blocked"
    | "smoke_test_planned"
    | "rollback_planned";
  detail: string;
  liveExecutionClaimed: false;
  createdAt: string;
};

function hasString(value: unknown): boolean {
  return typeof value === "string" && value.length > 0;
}

export function isLiveDeploymentExecutionContract(value: unknown): value is LiveDeploymentExecutionContract {
  if (typeof value !== "object" || value === null) return false;
  const v = value as Record<string, unknown>;
  return (
    hasString(v.deploymentId) &&
    hasString(v.projectId) &&
    hasString(v.domainId) &&
    hasString(v.providerId) &&
    hasString(v.deploymentTarget) &&
    hasString(v.credentialBindingId) &&
    hasString(v.approvalRequestId) &&
    hasString(v.preDeployChecklistId) &&
    hasString(v.executionPlanId) &&
    hasString(v.postDeploySmokeTestPlanId) &&
    hasString(v.rollbackPlanId) &&
    Array.isArray(v.auditEventIds) &&
    typeof v.blockedByDefault === "boolean" &&
    typeof v.liveExecutionAllowed === "boolean" &&
    typeof v.liveExecutionPerformed === "boolean" &&
    hasString(v.nonExecutionProof) &&
    hasString(v.createdAt)
  );
}

export function isDeploymentApprovalRequest(value: unknown): value is DeploymentApprovalRequest {
  if (typeof value !== "object" || value === null) return false;
  const v = value as Record<string, unknown>;
  return (
    hasString(v.approvalRequestId) &&
    hasString(v.projectId) &&
    hasString(v.domainId) &&
    hasString(v.providerId) &&
    hasString(v.requestedAction) &&
    hasString(v.riskLevel) &&
    hasString(v.requiredApprover) &&
    hasString(v.approvalStatus) &&
    typeof v.approvalRequired === "boolean" &&
    typeof v.explicitUserApprovalRequired === "boolean" &&
    (typeof v.approvalEvidence === "string" || v.approvalEvidence === null) &&
    hasString(v.expiresAt) &&
    hasString(v.createdAt)
  );
}
