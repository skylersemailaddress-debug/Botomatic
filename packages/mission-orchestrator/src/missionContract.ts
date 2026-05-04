import crypto from "crypto";
import type { MissionClaimLevel } from "./missionModel.js";

export type SourceType = "text" | "file" | "url" | "structured";
export type TargetArchitecture =
  | "single_page_app"
  | "full_stack_app"
  | "enterprise_monorepo"
  | "multi_service_system"
  | "api_service"
  | "admin_console"
  | "workflow_platform"
  | "repair_existing_repo"
  | "integration_platform";

export interface ContractAssumption {
  id: string;
  field: string;
  decision: string;
  reason: string;
  risk: "low" | "medium" | "high";
  autoDecided: boolean;
}

export interface ContractQuestion {
  id: string;
  field: string;
  question: string;
  risk: "low" | "medium" | "high";
  blocking: boolean;
}

export interface MissionContract {
  missionId: string;
  projectId: string;
  sourceSpecHash: string;
  sourceType: SourceType;
  lockedSpecVersion: string;
  userApproved: boolean;
  approvedAt?: string;
  approvedBy?: string;
  productType: string;
  targetArchitecture: TargetArchitecture;
  assumptions: ContractAssumption[];
  blockers: string[];
  unresolvedQuestions: ContractQuestion[];
  excludedScope: string[];
  acceptanceCriteria: string[];
  requiredCapabilities: string[];
  requiredWaves: string[];
  claimBoundary: MissionClaimLevel;
  lockedAt?: string;
}

// HIGH_RISK_FIELDS: missing or unresolved answers block mission execution
export const HIGH_RISK_FIELDS = [
  "auth",
  "payments",
  "database",
  "storage",
  "external_integrations",
  "roles_permissions",
  "tenancy",
  "compliance",
  "security",
  "deployment_target",
  "secrets_strategy",
  "destructive_operations",
  "production_readiness",
];

export function isHighRiskField(field: string): boolean {
  const lower = field.toLowerCase();
  return HIGH_RISK_FIELDS.some((f) => lower.includes(f.replace(/_/g, " ").split("_")[0]) || lower.includes(f));
}

export function hasBlockingQuestions(contract: MissionContract): boolean {
  return contract.unresolvedQuestions.some((q) => q.blocking);
}

export function canExecuteMission(contract: MissionContract): { allowed: boolean; reason: string } {
  const blocking = contract.unresolvedQuestions.filter((q) => q.blocking);
  if (blocking.length > 0) {
    return {
      allowed: false,
      reason: `${blocking.length} high-risk question(s) must be resolved: ${blocking.map((q) => q.field).join(", ")}`,
    };
  }
  if (contract.blockers.length > 0) {
    return { allowed: false, reason: `Contract has blockers: ${contract.blockers.join("; ")}` };
  }
  if (!contract.userApproved) {
    return { allowed: false, reason: "Mission contract requires user approval before execution." };
  }
  return { allowed: true, reason: "Contract is locked and approved." };
}

export function lockContract(contract: MissionContract, approvedBy = "system"): MissionContract {
  const blocking = contract.unresolvedQuestions.filter((q) => q.blocking);
  if (blocking.length > 0) {
    throw new Error(`Cannot lock contract with ${blocking.length} blocking question(s): ${blocking.map((q) => q.field).join(", ")}`);
  }
  return {
    ...contract,
    userApproved: true,
    approvedAt: new Date().toISOString(),
    approvedBy,
    lockedAt: new Date().toISOString(),
    lockedSpecVersion: crypto.createHash("sha256").update(JSON.stringify(contract.acceptanceCriteria) + contract.sourceSpecHash).digest("hex").slice(0, 12),
  };
}

export function buildContractFromSpec(params: {
  missionId: string;
  projectId: string;
  sourceSpecHash: string;
  sourceType: SourceType;
  productType: string;
  targetArchitecture: TargetArchitecture;
  detectedCapabilities: string[];
  requiredWaves: string[];
  unresolvedQuestions: ContractQuestion[];
  assumptions: ContractAssumption[];
  excludedScope: string[];
  acceptanceCriteria: string[];
}): MissionContract {
  const blockers: string[] = [];
  params.unresolvedQuestions
    .filter((q) => q.blocking && q.risk === "high")
    .forEach((q) => blockers.push(`Unresolved high-risk question: ${q.field} — ${q.question}`));

  return {
    missionId: params.missionId,
    projectId: params.projectId,
    sourceSpecHash: params.sourceSpecHash,
    sourceType: params.sourceType,
    lockedSpecVersion: "",
    userApproved: false,
    productType: params.productType,
    targetArchitecture: params.targetArchitecture,
    assumptions: params.assumptions,
    blockers,
    unresolvedQuestions: params.unresolvedQuestions,
    excludedScope: params.excludedScope,
    acceptanceCriteria: params.acceptanceCriteria,
    requiredCapabilities: params.detectedCapabilities,
    requiredWaves: params.requiredWaves,
    claimBoundary: "MISSION_COMPILED",
  };
}
