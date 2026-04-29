import type { DirtyRepoEvidenceEntry, DirtyRepoEvidenceSeverity, DirtyRepoEvidenceSnapshot } from "../../repo-intake/src/dirtyRepoEvidence";
import type { DirtyRepoCompletionContractV2 } from "./completionRunner";

export type DirtyRepoRepairLoopStatus = "blocked" | "plan_ready" | "validation_ready" | "candidate_ready";

export type DirtyRepoRepairActionType =
  | "normalize_manifest"
  | "remove_placeholder"
  | "document_integration_boundary"
  | "document_security_boundary"
  | "add_missing_script"
  | "add_validator"
  | "add_test"
  | "isolate_untrusted_execution"
  | "request_user_evidence"
  | "defer_live_deployment";

export type DirtyRepoRepairRisk = {
  id: string;
  severity: DirtyRepoEvidenceSeverity;
  message: string;
  evidenceEntryIds: string[];
};

export type DirtyRepoRepairAction = {
  id: string;
  actionType: DirtyRepoRepairActionType;
  title: string;
  rationale: string;
  priority: number;
  risk: DirtyRepoEvidenceSeverity;
  evidenceEntryIds: string[];
  blocked: boolean;
  requiresUserApproval: boolean;
  executesUntrustedCode: false;
};

export type DirtyRepoRepairPlan = {
  orderedActions: DirtyRepoRepairAction[];
  unresolvedCriticalBlockers: string[];
};

export type DirtyRepoRepairSafetyPosture = {
  noUntrustedExecution: true;
  planningMode: "static_evidence_only";
};

export type DirtyRepoRepairValidationStep = {
  id: "static_validation" | "no_placeholder_scan" | "security_scan" | "integration_boundary_review" | "user_approval";
  label: string;
  required: true;
  completed: boolean;
  evidenceEntryIds: string[];
};

export type DirtyRepoRepairLoopProof = {
  generatedAt: string;
  status: DirtyRepoRepairLoopStatus;
  evidenceSnapshotId: string;
  completionContractVersion: "2.0";
  plan: DirtyRepoRepairPlan;
  risks: DirtyRepoRepairRisk[];
  safetyPosture: DirtyRepoRepairSafetyPosture;
  validationSteps: DirtyRepoRepairValidationStep[];
  claimBoundary: string;
};

function priorityFor(entry: DirtyRepoEvidenceEntry): number {
  if (entry.severity === "critical" || entry.category === "security") return 10;
  if (entry.severity === "high") return 20;
  if (entry.category === "placeholder") return 30;
  if (entry.category === "integration") return 40;
  return 50;
}

function actionTypeFor(entry: DirtyRepoEvidenceEntry): DirtyRepoRepairActionType {
  if (entry.category === "security") return "document_security_boundary";
  if (entry.category === "integration") return "document_integration_boundary";
  if (entry.category === "placeholder") return "remove_placeholder";
  if (entry.category === "commercial") return "defer_live_deployment";
  return "normalize_manifest";
}

export function deriveDirtyRepoRepairPlan(
  evidenceSnapshot: DirtyRepoEvidenceSnapshot,
  completionContractV2: DirtyRepoCompletionContractV2
): DirtyRepoRepairPlan {
  const actions: DirtyRepoRepairAction[] = evidenceSnapshot.entries.map((entry, index) => {
    const actionType = actionTypeFor(entry);
    const blocked = entry.severity === "critical" || actionType === "isolate_untrusted_execution";
    const requiresUserApproval = entry.severity === "critical" || entry.category === "security";
    return {
      id: `repair_${index + 1}`,
      actionType,
      title: `Repair ${entry.category} finding`,
      rationale: entry.message,
      priority: priorityFor(entry),
      risk: entry.severity,
      evidenceEntryIds: [entry.id],
      blocked,
      requiresUserApproval,
      executesUntrustedCode: false,
    };
  });

  actions.push({
    id: `repair_${actions.length + 1}`,
    actionType: "add_validator",
    title: "Add static validation coverage",
    rationale: "Ensure every repair action remains evidence-linked.",
    priority: 35,
    risk: "medium",
    evidenceEntryIds: evidenceSnapshot.entries.map((e) => e.id),
    blocked: false,
    requiresUserApproval: false,
    executesUntrustedCode: false,
  });

  actions.push({
    id: `repair_${actions.length + 1}`,
    actionType: "request_user_evidence",
    title: "Request user approval and missing evidence",
    rationale: "Approval is required before any claim expansion.",
    priority: 90,
    risk: "low",
    evidenceEntryIds: evidenceSnapshot.entries.map((e) => e.id),
    blocked: true,
    requiresUserApproval: true,
    executesUntrustedCode: false,
  });

  const orderedActions = [...actions].sort((a, b) => a.priority - b.priority || a.id.localeCompare(b.id));
  const unresolvedCriticalBlockers = completionContractV2.blockers
    .filter((b) => b.severity === "critical")
    .map((b) => b.id);
  return { orderedActions, unresolvedCriticalBlockers };
}

export function validateDirtyRepoRepairLoopProof(proof: DirtyRepoRepairLoopProof): string[] {
  const errors: string[] = [];
  if (!proof.safetyPosture.noUntrustedExecution) errors.push("safetyPosture.noUntrustedExecution must be true");
  if (["launch_ready", "production_ready"].includes(String((proof as any).status))) errors.push("invalid status boundary");
  proof.plan.orderedActions.forEach((action, i) => {
    if (!Array.isArray(action.evidenceEntryIds) || action.evidenceEntryIds.length === 0) errors.push(`actions[${i}] missing evidenceEntryIds`);
    if (action.executesUntrustedCode) errors.push(`actions[${i}] cannot execute untrusted code during planning`);
    if ((action.actionType === "isolate_untrusted_execution" || action.requiresUserApproval) && !action.blocked && !action.requiresUserApproval) {
      errors.push(`actions[${i}] must be blocked or require user approval`);
    }
  });
  if (proof.status === "candidate_ready" && proof.plan.unresolvedCriticalBlockers.length > 0) {
    errors.push("candidate_ready cannot be set while critical blockers remain");
  }
  if (proof.status === "candidate_ready" && proof.plan.orderedActions.some((a) => a.evidenceEntryIds.length === 0)) {
    errors.push("candidate_ready cannot be set with actions missing evidenceEntryIds");
  }
  return errors;
}

export function buildDirtyRepoRepairLoopProof(input: {
  evidenceSnapshot: DirtyRepoEvidenceSnapshot;
  completionContractV2: DirtyRepoCompletionContractV2;
  generatedAt?: string;
}): DirtyRepoRepairLoopProof {
  const plan = deriveDirtyRepoRepairPlan(input.evidenceSnapshot, input.completionContractV2);
  const risks: DirtyRepoRepairRisk[] = input.evidenceSnapshot.entries.map((entry) => ({
    id: `repair_risk_${entry.id}`,
    severity: entry.severity,
    message: entry.message,
    evidenceEntryIds: [entry.id],
  }));

  const validationSteps: DirtyRepoRepairValidationStep[] = [
    { id: "static_validation", label: "Static repair-loop validation", required: true, completed: true, evidenceEntryIds: input.evidenceSnapshot.entries.map((e) => e.id) },
    { id: "no_placeholder_scan", label: "No-placeholder scan", required: true, completed: false, evidenceEntryIds: input.evidenceSnapshot.entries.filter((e) => e.category === "placeholder").map((e) => e.id) },
    { id: "security_scan", label: "Security scan", required: true, completed: false, evidenceEntryIds: input.evidenceSnapshot.entries.filter((e) => e.category === "security").map((e) => e.id) },
    { id: "integration_boundary_review", label: "Integration boundary review", required: true, completed: false, evidenceEntryIds: input.evidenceSnapshot.entries.filter((e) => e.category === "integration").map((e) => e.id) },
    { id: "user_approval", label: "User approval", required: true, completed: false, evidenceEntryIds: input.evidenceSnapshot.entries.map((e) => e.id) },
  ];

  const status: DirtyRepoRepairLoopStatus =
    plan.unresolvedCriticalBlockers.length > 0
      ? "blocked"
      : validationSteps.some((step) => !step.completed)
        ? "validation_ready"
        : "candidate_ready";

  return {
    generatedAt: input.generatedAt || new Date().toISOString(),
    status,
    evidenceSnapshotId: input.evidenceSnapshot.snapshotId,
    completionContractVersion: input.completionContractV2.contractVersion,
    plan,
    risks,
    safetyPosture: { noUntrustedExecution: true, planningMode: "static_evidence_only" },
    validationSteps,
    claimBoundary: "repair-loop proof is evidence-bound candidate planning only; not launch-ready and not production-ready",
  };
}

export function summarizeDirtyRepoRepairLoopProof(proof: DirtyRepoRepairLoopProof): string {
  return `${proof.status}; actions=${proof.plan.orderedActions.length}; critical=${proof.plan.unresolvedCriticalBlockers.length}; no_untrusted_execution=${proof.safetyPosture.noUntrustedExecution}`;
}
