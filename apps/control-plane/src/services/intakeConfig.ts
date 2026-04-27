const DEFAULT_MAX_UPLOAD_MB = 250;

function toPositiveInt(value: string | undefined, fallback: number): number {
  const parsed = Number(value);
  if (!Number.isFinite(parsed)) {
    return fallback;
  }
  const rounded = Math.floor(parsed);
  return rounded > 0 ? rounded : fallback;
}

export const MAX_UPLOAD_MB = toPositiveInt(process.env.NEXT_PUBLIC_BOTOMATIC_MAX_UPLOAD_MB, DEFAULT_MAX_UPLOAD_MB);
export const MAX_UPLOAD_BYTES = MAX_UPLOAD_MB * 1024 * 1024;

export const ACCEPTED_UPLOAD_EXTENSIONS = [
  ".zip",
  ".pdf",
  ".txt",
  ".md",
  ".docx",
  ".json",
  ".csv",
  ".ts",
  ".tsx",
  ".js",
  ".jsx",
  ".py",
  ".go",
  ".rs",
  ".java",
  ".cs",
  ".php",
  ".rb",
  ".png",
  ".jpg",
  ".jpeg",
  ".gif",
  ".webp",
  ".svg",
] as const;

export const ACCEPTED_UPLOAD_MIME_TYPES = [
  "application/zip",
  "application/x-zip-compressed",
  "application/pdf",
  "application/json",
  "text/plain",
  "text/markdown",
  "text/csv",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  "application/msword",
  "image/png",
  "image/jpeg",
  "image/gif",
  "image/webp",
  "image/svg+xml",
] as const;

export const ACCEPTED_UPLOAD_ACCEPT_ATTR = ACCEPTED_UPLOAD_EXTENSIONS.join(",");

export function formatMaxUploadLabel(maxUploadMb = MAX_UPLOAD_MB): string {
  return `${maxUploadMb} MB`;
}

export function isSupportedUploadSelection(file: File): boolean {
  const ext = `.${file.name.split(".").pop()?.toLowerCase() || ""}`;
  if (ACCEPTED_UPLOAD_EXTENSIONS.includes(ext as any)) {
    return true;
  }
  if (file.type.startsWith("text/")) {
    return true;
  }
  return ACCEPTED_UPLOAD_MIME_TYPES.includes(file.type as any);
}
