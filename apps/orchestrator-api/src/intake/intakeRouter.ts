import path from "path";
import { type IntakeSourceType, type IntakeIngestionMode } from "./sourceModel";

export type IntakeRouterInput = {
  sourceType: IntakeSourceType;
  sourceUri?: string;
  displayName?: string;
  sizeBytes?: number | null;
  maxUploadBytes: number;
  hasConnectorCredentials?: boolean;
};

export type IntakeRouterOutput = {
  accepted: boolean;
  rejected: boolean;
  recommendedIntakePath: IntakeIngestionMode;
  reason: string;
  nextAction: string;
  requiredCredentials: string[];
  expectedProcessingSteps: string[];
};

export function routeIntakeInput(input: IntakeRouterInput): IntakeRouterOutput {
  const size = Number(input.sizeBytes || 0);
  const ext = path.extname(String(input.displayName || input.sourceUri || "")).toLowerCase();

  if (input.sourceType === "pasted_text") {
    return {
      accepted: true,
      rejected: false,
      recommendedIntakePath: "metadata_only",
      reason: "Pasted text routes directly to spec parsing.",
      nextAction: "Parse pasted text into spec context.",
      requiredCredentials: [],
      expectedProcessingSteps: ["intake_source_registered", "intake_route_selected", "ingestion_started", "intake_manifest_written", "intake_completed"],
    };
  }

  if (input.sourceType === "cloud_storage_link") {
    if (!input.hasConnectorCredentials) {
      return {
        accepted: true,
        rejected: false,
        recommendedIntakePath: "metadata_only",
        reason: "Cloud link requires connector/auth before fetch.",
        nextAction: "Provide connector credentials or continue metadata-only registration.",
        requiredCredentials: ["cloud_connector_access"],
        expectedProcessingSteps: ["intake_source_registered", "intake_route_selected", "intake_blocked_requires_auth", "intake_manifest_written"],
      };
    }

    return {
      accepted: true,
      rejected: false,
      recommendedIntakePath: "connector_fetch",
      reason: "Cloud link is accessible with provided connector credentials.",
      nextAction: "Fetch cloud object with stream and run intake safety checks.",
      requiredCredentials: [],
      expectedProcessingSteps: ["intake_source_registered", "intake_route_selected", "remote_fetch_started", "archive_scan_started", "intake_manifest_written", "intake_completed"],
    };
  }

  if (input.sourceType === "github_repo_url" || input.sourceType === "github_branch_url" || input.sourceType === "github_pr_url") {
    return {
      accepted: true,
      rejected: false,
      recommendedIntakePath: "remote_fetch",
      reason: "GitHub URL intake uses safe metadata fetch or shallow clone path.",
      nextAction: "Run GitHub URL parser and repository safety scan without executing code.",
      requiredCredentials: [],
      expectedProcessingSteps: ["intake_source_registered", "intake_route_selected", "remote_fetch_started", "repo_scan_started", "secret_scan_started", "framework_detection_started", "intake_manifest_written", "intake_completed"],
    };
  }

  if (input.sourceType === "local_folder_manifest") {
    return {
      accepted: true,
      rejected: false,
      recommendedIntakePath: "metadata_only",
      reason: "Local folder manifests are registered for desktop/handoff intake.",
      nextAction: "Validate manifest schema and persist metadata for staged intake.",
      requiredCredentials: [],
      expectedProcessingSteps: ["intake_source_registered", "intake_route_selected", "intake_manifest_written", "intake_completed"],
    };
  }

  if (
    input.sourceType === "uploaded_zip" ||
    input.sourceType === "uploaded_repo_zip" ||
    ext === ".zip"
  ) {
    return {
      accepted: true,
      rejected: false,
      recommendedIntakePath: "streaming_upload",
      reason: "Archive uploads require scan-before-extract safety path.",
      nextAction: "Stream upload, run archive checks, and extract safe text/code files.",
      requiredCredentials: [],
      expectedProcessingSteps: ["intake_source_registered", "intake_route_selected", "upload_started", "archive_scan_started", "extraction_started", "intake_manifest_written", "intake_completed"],
    };
  }

  if (size > input.maxUploadBytes) {
    return {
      accepted: false,
      rejected: true,
      recommendedIntakePath: "metadata_only",
      reason: "Upload exceeds configured direct-upload limit.",
      nextAction: "Use GitHub URL or cloud link for very large projects.",
      requiredCredentials: [],
      expectedProcessingSteps: ["intake_source_registered", "intake_route_selected", "intake_failed"],
    };
  }

  if (input.sourceType === "uploaded_pdf" || ext === ".pdf") {
    return {
      accepted: true,
      rejected: false,
      recommendedIntakePath: size > Math.min(input.maxUploadBytes, 25 * 1024 * 1024) ? "streaming_upload" : "direct_upload",
      reason: "PDF intake supports direct upload with parse safeguards.",
      nextAction: "Upload and parse safely with bounded extraction.",
      requiredCredentials: [],
      expectedProcessingSteps: ["intake_source_registered", "intake_route_selected", "upload_started", "ingestion_started", "intake_manifest_written", "intake_completed"],
    };
  }

  if (input.sourceType === "uploaded_file") {
    return {
      accepted: true,
      rejected: false,
      recommendedIntakePath: size > 25 * 1024 * 1024 ? "streaming_upload" : "direct_upload",
      reason: "File upload is within configured limits.",
      nextAction: "Proceed with upload and safety validation.",
      requiredCredentials: [],
      expectedProcessingSteps: ["intake_source_registered", "intake_route_selected", "upload_started", "ingestion_started", "intake_manifest_written", "intake_completed"],
    };
  }

  return {
    accepted: false,
    rejected: true,
    recommendedIntakePath: "metadata_only",
    reason: "Unsupported intake source type.",
    nextAction: "Choose one of the supported intake methods.",
    requiredCredentials: [],
    expectedProcessingSteps: ["intake_source_registered", "intake_route_selected", "intake_failed"],
  };
}
