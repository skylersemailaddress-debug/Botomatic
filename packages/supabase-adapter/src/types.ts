export interface StoredProjectRecord {
projectId: string;
name: string;
request: string;
status: string;
governanceApproval?: GovernanceApprovalState | null;
masterTruth?: Record<string, unknown> | null;
plan?: Record<string, unknown> | null;
runs?: Record<string, unknown> | null;
validations?: Record<string, unknown> | null;
gitOperations?: Record<string, unknown> | null;
gitResults?: Record<string, unknown> | null;
auditEvents?: unknown[] | null;
createdAt: string;
updatedAt: string;
}

export type GovernanceApprovalState = {
modelVersion: "gate4-minimal-v1";
approvalStatus: "pending" | "approved";
runtimeProofRequired: true;
runtimeProofStatus: "required" | "captured";
updatedAt: string;
updatedBy: string;
};

export interface ProjectRepository {
getProject(projectId: string): Promise<StoredProjectRecord | null>;
upsertProject(record: StoredProjectRecord): Promise<void>;
}
