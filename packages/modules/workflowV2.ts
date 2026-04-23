import { saveWorkflowDB, getWorkflowDB } from "../persistence/src/workflowRepo";

export type WorkflowState = "draft" | "submitted" | "approved" | "rejected";

export type WorkflowRecord = {
  workflowId: string;
  state: WorkflowState;
  ownerRole: "admin" | "manager" | "user" | "viewer";
  updatedAt: string;
};

export async function createWorkflowV2(ownerRole: WorkflowRecord["ownerRole"]): Promise<WorkflowRecord> {
  const record: WorkflowRecord = {
    workflowId: `wf_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
    state: "draft",
    ownerRole,
    updatedAt: new Date().toISOString(),
  };

  await saveWorkflowDB(record);
  return record;
}

export async function transitionWorkflowV2(record: WorkflowRecord, next: WorkflowState): Promise<WorkflowRecord> {
  const allowed: Record<WorkflowState, WorkflowState[]> = {
    draft: ["submitted"],
    submitted: ["approved", "rejected"],
    approved: [],
    rejected: [],
  };

  if (!allowed[record.state].includes(next)) {
    throw new Error(`Invalid workflow transition: ${record.state} -> ${next}`);
  }

  const updated: WorkflowRecord = {
    ...record,
    state: next,
    updatedAt: new Date().toISOString(),
  };

  await saveWorkflowDB(updated);
  return updated;
}

export async function loadWorkflowV2(workflowId: string): Promise<WorkflowRecord | null> {
  return getWorkflowDB(workflowId);
}
