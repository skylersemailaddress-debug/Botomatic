import fs from "fs";
import path from "path";
import { pipeline } from "stream/promises";
import { PDFParse } from "pdf-parse";
import * as yauzl from "yauzl";

export const DEFAULT_MAX_UPLOAD_MB = 250;
export const DEFAULT_MAX_EXTRACTED_MB = 2000;
export const DEFAULT_MAX_ZIP_FILES = 20000;

const SECRET_PATTERNS: RegExp[] = [
  /sk_live_[0-9A-Za-z]{10,}/,
  /gh[pousr]_[0-9A-Za-z]{20,}/,
  /AKIA[0-9A-Z]{16}/,
  /xox[baprs]-[0-9A-Za-z-]{10,}/,
  /-----BEGIN (?:RSA |EC |OPENSSH )?PRIVATE KEY-----/,
  /eyJ[a-zA-Z0-9_-]{8,}\.[a-zA-Z0-9_-]{8,}\.[a-zA-Z0-9_-]{8,}/,
];

const SKIP_DIR_SEGMENTS = new Set(["node_modules", ".git", "dist", "build", ".next", "target", "vendor"]);

const SUPPORTED_EXTENSIONS = new Set([
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
]);

const ALLOWED_MIME_TYPES = new Set([
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
]);

const TEXT_EXTENSIONS = new Set([
  ".txt",
  ".md",
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
]);

export type IntakeLimits = {
  maxUploadMb: number;
  maxExtractedMb: number;
  maxZipFiles: number;
  maxUploadBytes: number;
  maxExtractedBytes: number;
};

export type ArchiveManifestEntry = {
  path: string;
  action: "extracted" | "skipped_binary" | "skipped_directory";
  sizeBytes: number;
};

export type IntakeProgressEvent = {
  type:
    | "upload_started"
    | "upload_received"
    | "validation_started"
    | "archive_scan_started"
    | "extraction_started"
    | "extraction_progress"
    | "ingestion_started"
    | "ingestion_completed"
    | "ingestion_failed";
  metadata?: Record<string, unknown>;
};

export type IntakeProcessingResult = {
  fileName: string;
  mimeType: string;
  sizeBytes: number;
  extractedText: string;
  extractedTextPreview: string;
  extractedChars: number;
  truncated: boolean;
  chunkCount: number;
  parseError: string | null;
  binarySummary: Array<{ path: string; reason: string; sizeBytes: number }>;
  extractionManifest: ArchiveManifestEntry[];
};

export class IntakeValidationError extends Error {
  code: string;
  statusCode: number;

  constructor(message: string, code: string, statusCode = 400) {
    super(message);
    this.code = code;
    this.statusCode = statusCode;
  }
}

export function getIntakeLimitsFromEnv(env: NodeJS.ProcessEnv): IntakeLimits {
  const maxUploadMb = Math.max(100, toPositiveInt(env.BOTOMATIC_MAX_UPLOAD_MB, DEFAULT_MAX_UPLOAD_MB));
  const maxExtractedMb = Math.max(500, toPositiveInt(env.BOTOMATIC_MAX_EXTRACTED_MB, DEFAULT_MAX_EXTRACTED_MB));
  const maxZipFiles = Math.max(1000, toPositiveInt(env.BOTOMATIC_MAX_ZIP_FILES, DEFAULT_MAX_ZIP_FILES));

  return {
    maxUploadMb,
    maxExtractedMb,
    maxZipFiles,
    maxUploadBytes: maxUploadMb * 1024 * 1024,
    maxExtractedBytes: maxExtractedMb * 1024 * 1024,
  };
}

function toPositiveInt(value: string | undefined, fallback: number): number {
  const parsed = Number(value);
  if (!Number.isFinite(parsed)) {
    return fallback;
  }
  const rounded = Math.floor(parsed);
  return rounded > 0 ? rounded : fallback;
}

export function getSupportedUploadExtensions(): string[] {
  return Array.from(SUPPORTED_EXTENSIONS).sort();
}

export function isSupportedUploadType(fileName: string, mimeType: string): boolean {
  const ext = path.extname(fileName).toLowerCase();
  if (SUPPORTED_EXTENSIONS.has(ext)) {
    return true;
  }
  if (mimeType.startsWith("text/")) {
    return true;
  }
  return ALLOWED_MIME_TYPES.has(mimeType.toLowerCase());
}

export function formatMaxUploadLabel(maxUploadMb: number): string {
  return `${maxUploadMb} MB`;
}

export function sanitizeArchivePath(rawPath: string): string {
  const normalizedSlashes = rawPath.replace(/\\/g, "/");
  if (!normalizedSlashes || normalizedSlashes.includes("\0")) {
    throw new IntakeValidationError("Unsafe archive path detected.", "UNSAFE_ARCHIVE_PATH");
  }
  if (normalizedSlashes.startsWith("/") || /^[A-Za-z]:\//.test(normalizedSlashes)) {
    throw new IntakeValidationError("Unsafe archive path detected.", "UNSAFE_ARCHIVE_PATH");
  }

  const normalized = path.posix.normalize(normalizedSlashes).replace(/^\.\//, "");
  if (!normalized || normalized === "." || normalized === ".." || normalized.startsWith("../")) {
    throw new IntakeValidationError("Unsafe archive path detected.", "UNSAFE_ARCHIVE_PATH");
  }
  return normalized;
}

function shouldSkipByDirectory(pathInArchive: string): boolean {
  const segments = pathInArchive.split("/").map((s) => s.toLowerCase());
  return segments.some((segment) => SKIP_DIR_SEGMENTS.has(segment));
}

function isTextPath(filePath: string): boolean {
  const ext = path.extname(filePath).toLowerCase();
  return TEXT_EXTENSIONS.has(ext);
}

function hasPotentialSecret(content: string): boolean {
  return SECRET_PATTERNS.some((pattern) => pattern.test(content));
}

async function readTextFileWithCap(filePath: string, limitBytes: number): Promise<string> {
  const stream = fs.createReadStream(filePath, { encoding: "utf8" });
  let out = "";
  for await (const chunk of stream) {
    const next = String(chunk);
    const remaining = limitBytes - Buffer.byteLength(out, "utf8");
    if (remaining <= 0) {
      break;
    }
    if (Buffer.byteLength(next, "utf8") <= remaining) {
      out += next;
    } else {
      out += Buffer.from(next).subarray(0, remaining).toString("utf8");
      break;
    }
  }
  stream.destroy();
  return out;
}

function isZipSymlink(entry: yauzl.Entry): boolean {
  const unixMode = (entry.externalFileAttributes >>> 16) & 0xffff;
  const type = unixMode & 0o170000;
  return type === 0o120000;
}

async function openZip(pathToZip: string): Promise<yauzl.ZipFile> {
  return new Promise((resolve, reject) => {
    yauzl.open(pathToZip, { lazyEntries: true, decodeStrings: true }, (error, zipFile) => {
      if (error || !zipFile) {
        reject(error || new Error("Unable to open zip archive"));
        return;
      }
      resolve(zipFile);
    });
  });
}

async function openZipReadStream(zipFile: yauzl.ZipFile, entry: yauzl.Entry): Promise<NodeJS.ReadableStream> {
  return new Promise((resolve, reject) => {
    zipFile.openReadStream(entry, (error, stream) => {
      if (error || !stream) {
        reject(error || new Error("Unable to read zip entry stream"));
        return;
      }
      resolve(stream);
    });
  });
}

async function withZipEntries(zipFile: yauzl.ZipFile, onEntry: (entry: yauzl.Entry) => Promise<void>): Promise<void> {
  return new Promise((resolve, reject) => {
    let pending = false;

    zipFile.on("entry", async (entry) => {
      pending = true;
      try {
        await onEntry(entry);
        pending = false;
        zipFile.readEntry();
      } catch (error) {
        zipFile.close();
        reject(error);
      }
    });

    zipFile.on("end", () => {
      if (!pending) {
        resolve();
      }
    });

    zipFile.on("close", () => {
      if (!pending) {
        resolve();
      }
    });

    zipFile.on("error", (error) => reject(error));

    zipFile.readEntry();
  });
}

export async function processUploadedFile(params: {
  uploadPath: string;
  originalName: string;
  mimeType: string;
  sizeBytes: number;
  workDir: string;
  limits: IntakeLimits;
  fullRepoAudit?: boolean;
  onProgressEvent?: (event: IntakeProgressEvent) => Promise<void> | void;
}): Promise<IntakeProcessingResult> {
  const { uploadPath, originalName, mimeType, sizeBytes, workDir, limits, fullRepoAudit, onProgressEvent } = params;

  if (sizeBytes > limits.maxUploadBytes) {
    throw new IntakeValidationError(
      `File too large (max ${limits.maxUploadMb} MB, got ${(sizeBytes / 1024 / 1024).toFixed(1)} MB).`,
      "FILE_TOO_LARGE",
      400
    );
  }

  if (!isSupportedUploadType(originalName, mimeType)) {
    throw new IntakeValidationError(`Unsupported file type: ${mimeType || path.extname(originalName) || "unknown"}.`, "UNSUPPORTED_FILE_TYPE", 400);
  }

  await onProgressEvent?.({ type: "validation_started", metadata: { fileName: originalName, mimeType, sizeBytes } });

  const ext = path.extname(originalName).toLowerCase();
  if (ext === ".zip") {
    return processZipUpload({ uploadPath, originalName, mimeType, sizeBytes, workDir, limits, fullRepoAudit, onProgressEvent });
  }
  return processSingleFileUpload({ uploadPath, originalName, mimeType, sizeBytes, limits, onProgressEvent });
}

async function processSingleFileUpload(params: {
  uploadPath: string;
  originalName: string;
  mimeType: string;
  sizeBytes: number;
  limits: IntakeLimits;
  onProgressEvent?: (event: IntakeProgressEvent) => Promise<void> | void;
}): Promise<IntakeProcessingResult> {
  const { uploadPath, originalName, mimeType, sizeBytes, limits, onProgressEvent } = params;
  await onProgressEvent?.({ type: "ingestion_started", metadata: { fileName: originalName } });

  const MAX_EXTRACT_BYTES = Math.min(limits.maxExtractedBytes, 1_000_000);
  let parseError: string | null = null;
  let extractedText = "";

  if (path.extname(originalName).toLowerCase() === ".pdf") {
    try {
      const parseCapBytes = 25 * 1024 * 1024;
      if (sizeBytes > parseCapBytes) {
        parseError = `PDF parsing skipped for large file (> ${Math.floor(parseCapBytes / (1024 * 1024))} MB).`;
      } else {
        const data = fs.readFileSync(uploadPath);
        const parser = new PDFParse({ data });
        const pdfData = await parser.getText();
        await parser.destroy();
        extractedText = String(pdfData.text || "");
      }
    } catch (error: any) {
      parseError = `PDF parse failed: ${String(error?.message || error)}`;
      extractedText = "";
    }
  } else {
    try {
      extractedText = await readTextFileWithCap(uploadPath, MAX_EXTRACT_BYTES);
    } catch (error: any) {
      parseError = `Text decode failed: ${String(error?.message || error)}`;
      extractedText = "";
    }
  }

  if (hasPotentialSecret(extractedText)) {
    throw new IntakeValidationError(
      "Uploaded file appears to contain secret material. Remove secrets before upload.",
      "POTENTIAL_SECRET_DETECTED",
      400
    );
  }

  const truncated = extractedText.length > MAX_EXTRACT_BYTES;
  const fullText = truncated ? extractedText.slice(0, MAX_EXTRACT_BYTES) : extractedText;
  const CHUNK_SIZE = 4000;
  const chunkCount = Math.max(1, Math.ceil(fullText.length / CHUNK_SIZE));

  await onProgressEvent?.({ type: "ingestion_completed", metadata: { extractedChars: fullText.length, chunkCount, truncated } });

  return {
    fileName: originalName,
    mimeType,
    sizeBytes,
    extractedText: fullText,
    extractedTextPreview: fullText.slice(0, 500),
    extractedChars: fullText.length,
    truncated,
    chunkCount,
    parseError,
    binarySummary: [],
    extractionManifest: [{ path: originalName, action: "extracted", sizeBytes }],
  };
}

async function processZipUpload(params: {
  uploadPath: string;
  originalName: string;
  mimeType: string;
  sizeBytes: number;
  workDir: string;
  limits: IntakeLimits;
  fullRepoAudit?: boolean;
  onProgressEvent?: (event: IntakeProgressEvent) => Promise<void> | void;
}): Promise<IntakeProcessingResult> {
  const { uploadPath, originalName, mimeType, sizeBytes, workDir, limits, fullRepoAudit, onProgressEvent } = params;
  const extractRoot = path.join(workDir, "extracted");
  fs.mkdirSync(extractRoot, { recursive: true });

  await onProgressEvent?.({ type: "archive_scan_started", metadata: { fileName: originalName, sizeBytes } });

  const zipFile = await openZip(uploadPath);
  let scannedEntries = 0;
  let extractedEntries = 0;
  let extractedBytes = 0;
  let extractedTextBytes = 0;

  const manifest: ArchiveManifestEntry[] = [];
  const snippets: string[] = [];
  const binarySummary: Array<{ path: string; reason: string; sizeBytes: number }> = [];

  await onProgressEvent?.({ type: "extraction_started", metadata: { maxZipFiles: limits.maxZipFiles, maxExtractedBytes: limits.maxExtractedBytes } });

  await withZipEntries(zipFile, async (entry) => {
    scannedEntries += 1;
    if (scannedEntries > limits.maxZipFiles) {
      throw new IntakeValidationError(
        `Archive has too many files (max ${limits.maxZipFiles}).`,
        "TOO_MANY_FILES",
        400
      );
    }

    if (/\/$/.test(entry.fileName)) {
      return;
    }

    if (isZipSymlink(entry)) {
      throw new IntakeValidationError("Unsafe archive path detected (symlink entry).", "UNSAFE_ARCHIVE_PATH", 400);
    }

    const safePath = sanitizeArchivePath(entry.fileName);

    if (!fullRepoAudit && shouldSkipByDirectory(safePath)) {
      manifest.push({ path: safePath, action: "skipped_directory", sizeBytes: entry.uncompressedSize || 0 });
      return;
    }

    extractedBytes += entry.uncompressedSize || 0;
    if (extractedBytes > limits.maxExtractedBytes) {
      throw new IntakeValidationError(
        `Extracted size too large (max ${limits.maxExtractedMb} MB).`,
        "EXTRACTED_SIZE_TOO_LARGE",
        400
      );
    }

    const destinationPath = path.resolve(extractRoot, safePath);
    if (!destinationPath.startsWith(path.resolve(extractRoot) + path.sep)) {
      throw new IntakeValidationError("Unsafe archive path detected.", "UNSAFE_ARCHIVE_PATH", 400);
    }

    fs.mkdirSync(path.dirname(destinationPath), { recursive: true });

    if (!isTextPath(safePath)) {
      manifest.push({ path: safePath, action: "skipped_binary", sizeBytes: entry.uncompressedSize || 0 });
      binarySummary.push({ path: safePath, reason: "Binary file summarized only", sizeBytes: entry.uncompressedSize || 0 });
      return;
    }

    const stream = await openZipReadStream(zipFile, entry);
    const out = fs.createWriteStream(destinationPath, { flags: "w" });
    await pipeline(stream as any, out);

    const perFileCap = Math.min(200_000, limits.maxExtractedBytes);
    const snippet = await readTextFileWithCap(destinationPath, perFileCap);
    extractedTextBytes += Buffer.byteLength(snippet, "utf8");

    if (hasPotentialSecret(snippet)) {
      throw new IntakeValidationError(
        "Uploaded archive appears to contain secret material. Remove secrets before upload.",
        "POTENTIAL_SECRET_DETECTED",
        400
      );
    }

    snippets.push(`### ${safePath}\n${snippet.slice(0, 4000)}`);
    manifest.push({ path: safePath, action: "extracted", sizeBytes: entry.uncompressedSize || 0 });
    extractedEntries += 1;

    if (scannedEntries % 20 === 0) {
      await onProgressEvent?.({
        type: "extraction_progress",
        metadata: {
          scannedEntries,
          extractedEntries,
          extractedBytes,
          maxExtractedBytes: limits.maxExtractedBytes,
          maxZipFiles: limits.maxZipFiles,
        },
      });
    }
  });

  const MAX_TEXT_BYTES = Math.min(limits.maxExtractedBytes, 1_500_000);
  let extractedText = snippets.join("\n\n");
  const truncated = Buffer.byteLength(extractedText, "utf8") > MAX_TEXT_BYTES;
  if (truncated) {
    extractedText = Buffer.from(extractedText).subarray(0, MAX_TEXT_BYTES).toString("utf8");
  }

  const CHUNK_SIZE = 4000;
  const chunkCount = Math.max(1, Math.ceil(extractedText.length / CHUNK_SIZE));

  await onProgressEvent?.({
    type: "ingestion_completed",
    metadata: {
      scannedEntries,
      extractedEntries,
      extractedBytes,
      extractedTextBytes,
      chunkCount,
      truncated,
    },
  });

  return {
    fileName: originalName,
    mimeType,
    sizeBytes,
    extractedText,
    extractedTextPreview: extractedText.slice(0, 500),
    extractedChars: extractedText.length,
    truncated,
    chunkCount,
    parseError: null,
    binarySummary,
    extractionManifest: manifest,
  };
}
