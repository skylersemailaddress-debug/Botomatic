export interface StoredProjectRecord {
projectId: string;
ownerUserId: string;
tenantId?: string | null;
name: string;
request: string;
status: string;
ownerId?: string | null;
governanceApproval?: GovernanceApprovalState | null;
masterTruth?: Record<string, unknown> | null;
plan?: Record<string, unknown> | null;
runs?: Record<string, unknown> | null;
validations?: Record<string, unknown> | null;
gitOperations?: Record<string, unknown> | null;
gitResults?: Record<string, unknown> | null;
auditEvents?: unknown[] | null;
	approvalMode?: 'strict' | 'guided' | 'autopilot' | 'enterprise';
	autoApprovedAt?: string | null;
	lastApprovalDecision?: {
		approved: boolean;
		mode: 'strict' | 'guided' | 'autopilot' | 'enterprise';
		reason: string;
		conditions: {
			contractComplete: boolean;
			noHighRiskDecisions: boolean;
			blueprintSelected: boolean;
			noConflicts: boolean;
		};
		highRiskDecisions: string[];
		createdAt: string;
	} | null;
	blueprint?: string | null;
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
getProjectForActor(projectId: string, actorId: string): Promise<StoredProjectRecord | null>;
upsertProject(record: StoredProjectRecord): Promise<void>;
upsertProjectForActor(record: StoredProjectRecord, actorId: string): Promise<void>;
}

export function actorOwnsProject(record: Pick<StoredProjectRecord, "ownerUserId"> | null, actorId: string): boolean {
  return Boolean(record && record.ownerUserId === actorId);
}
