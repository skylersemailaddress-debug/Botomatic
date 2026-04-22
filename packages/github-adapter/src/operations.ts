export type GitOperationType = "create_branch" | "commit_files" | "open_pull_request" | "sync_checks";
export type GitOperationStatus = "pending" | "submitted" | "succeeded" | "failed";

export interface GitOperationRequest {
  operationId: string;
  projectId: string;
  packetId: string;
  type: GitOperationType;
  branchName?: string;
  baseBranch?: string;
  title?: string;
  body?: string;
  status: GitOperationStatus;
  createdAt: string;
  updatedAt: string;
}

export interface GitOperationResult {
  operationId: string;
  status: Exclude<GitOperationStatus, "pending">;
  branchName?: string;
  prUrl?: string;
  commitSha?: string;
  checksUrl?: string;
  error?: string;
  updatedAt: string;
}

export function createGitOperation(input: {
  projectId: string;
  packetId: string;
  type: GitOperationType;
  branchName?: string;
  baseBranch?: string;
  title?: string;
  body?: string;
  operationId?: string;
}): GitOperationRequest {
  const now = new Date().toISOString();

  return {
    operationId: input.operationId || `gitop_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
    projectId: input.projectId,
    packetId: input.packetId,
    type: input.type,
    branchName: input.branchName,
    baseBranch: input.baseBranch,
    title: input.title,
    body: input.body,
    status: "pending",
    createdAt: now,
    updatedAt: now
  };
}
