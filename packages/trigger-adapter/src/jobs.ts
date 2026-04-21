export type TriggerJobType =
  | "compile_project"
  | "plan_project"
  | "execute_next_packet"
  | "process_git_operation"
  | "process_validation_result";

export type TriggerJobStatus = "pending" | "queued" | "running" | "succeeded" | "failed";

export interface TriggerJobRecord {
  jobId: string;
  projectId: string;
  type: TriggerJobType;
  status: TriggerJobStatus;
  payload?: Record<string, unknown>;
  createdAt: string;
  updatedAt: string;
}

export function createTriggerJob(input: {
  projectId: string;
  type: TriggerJobType;
  payload?: Record<string, unknown>;
}): TriggerJobRecord {
  const now = new Date().toISOString();
  return {
    jobId: `job_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
    projectId: input.projectId,
    type: input.type,
    status: "pending",
    payload: input.payload,
    createdAt: now,
    updatedAt: now
  };
}
