export type WorkflowState = "draft" | "submitted" | "approved" | "rejected";

export type WorkflowRecord = {
  workflowId: string;
  state: WorkflowState;
  ownerRole: "admin" | "manager" | "user" | "viewer";
  updatedAt: string;
};

export function createWorkflow(ownerRole: WorkflowRecord["ownerRole"]): WorkflowRecord {
  return {
    workflowId: `wf_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
    state: "draft",
    ownerRole,
    updatedAt: new Date().toISOString(),
  };
}

export function transitionWorkflow(record: WorkflowRecord, next: WorkflowState): WorkflowRecord {
  const allowed: Record<WorkflowState, WorkflowState[]> = {
    draft: ["submitted"],
    submitted: ["approved", "rejected"],
    approved: [],
    rejected: [],
  };

  if (!allowed[record.state].includes(next)) {
    throw new Error(`Invalid workflow transition: ${record.state} -> ${next}`);
  }

  return {
    ...record,
    state: next,
    updatedAt: new Date().toISOString(),
  };
}
