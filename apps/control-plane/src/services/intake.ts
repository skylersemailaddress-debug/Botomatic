import { postJson, postMultipart } from "./api";

export type IntakeResponse = {
  projectId: string;
  status: string;
  actorId: string;
};

export type FileIntakeResponse = {
  ok: boolean;
  artifactId: string;
  fileName: string;
  mimeType: string;
  sizeBytes: number;
  extractedChars: number;
  extractedTextPreview: string;
  truncated: boolean;
  chunkCount: number;
  parseError: string | null;
  actorId: string;
  message: string;
};

export async function createLaunchProject(
  projectName: string = "Launch Project"
): Promise<IntakeResponse> {
  return postJson<IntakeResponse>("/api/projects/intake", {
    name: projectName,
    request: "Launch a new project with Botomatic control plane.",
  });
}

export async function uploadIntakeFile(projectId: string, file: File): Promise<FileIntakeResponse> {
  const form = new FormData();
  form.append("file", file, file.name);
  return postMultipart<FileIntakeResponse>(`/api/projects/${encodeURIComponent(projectId)}/intake/file`, form);
}
