export type IntakeSourceType =
  | "pasted_text"
  | "uploaded_file"
  | "uploaded_zip"
  | "uploaded_pdf"
  | "uploaded_repo_zip"
  | "github_repo_url"
  | "github_branch_url"
  | "github_pr_url"
  | "cloud_storage_link"
  | "local_folder_manifest"
  | "existing_project_reference";

export type IntakeIngestionMode =
  | "direct_upload"
  | "streaming_upload"
  | "remote_clone"
  | "remote_fetch"
  | "connector_fetch"
  | "metadata_only"
  | "staged_background_job";

export type IntakeSourceStatus =
  | "registered"
  | "routing"
  | "processing"
  | "completed"
  | "failed"
  | "blocked_requires_auth"
  | "rejected";

export type IntakeSource = {
  sourceId: string;
  projectId: string;
  sourceType: IntakeSourceType;
  sourceUri: string;
  displayName: string;
  status: IntakeSourceStatus;
  sizeBytes: number | null;
  estimatedSizeBytes: number | null;
  provider: string;
  authRequired: boolean;
  authStatus: "not_required" | "required" | "provided" | "missing";
  safetyStatus: "pending" | "passed" | "blocked";
  ingestionMode: IntakeIngestionMode;
  createdAt: string;
  updatedAt: string;
  metadata?: Record<string, unknown>;
};

export function makeSourceId(prefix = "src"): string {
  return `${prefix}_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
}

export function nowIso(): string {
  return new Date().toISOString();
}
