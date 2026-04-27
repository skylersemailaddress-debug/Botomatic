import { postJson, postMultipartWithProgress } from "./api";

export type IntakeResponse = {
  projectId: string;
  status: string;
  actorId: string;
};

export type FileIntakeResponse = {
  ok: boolean;
  artifactId: string;
  sourceId?: string;
  fileName: string;
  mimeType: string;
  sizeBytes: number;
  extractedChars: number;
  extractedTextPreview: string;
  truncated: boolean;
  chunkCount: number;
  parseError: string | null;
  extractionManifest?: Array<{ path: string; action: string; sizeBytes: number }>;
  binarySummary?: Array<{ path: string; reason: string; sizeBytes: number }>;
  configuredMaxUploadMb?: number;
  configuredMaxExtractedMb?: number;
  configuredMaxZipFiles?: number;
  acceptedExtensions?: string[];
  actorId: string;
  message: string;
};

export type UploadIntakeOptions = {
  onUploadProgress?: (progressPercent: number) => void;
  fullRepoAudit?: boolean;
};

export async function createLaunchProject(
  projectName: string = "Launch Project"
): Promise<IntakeResponse> {
  return postJson<IntakeResponse>("/api/projects/intake", {
    name: projectName,
    request: "Launch a new project with Botomatic control plane.",
  });
}

export async function uploadIntakeFile(
  projectId: string,
  file: File,
  options: UploadIntakeOptions = {}
): Promise<FileIntakeResponse> {
  const form = new FormData();
  form.append("file", file, file.name);
  const endpoint = `/api/projects/${encodeURIComponent(projectId)}/intake/file${options.fullRepoAudit ? "?fullRepoAudit=true" : ""}`;
  return postMultipartWithProgress<FileIntakeResponse>(endpoint, form, {
    onUploadProgress: options.onUploadProgress,
  });
}
