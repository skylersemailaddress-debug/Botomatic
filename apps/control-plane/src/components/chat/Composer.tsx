"use client";

import { useRef, useState, DragEvent, KeyboardEvent } from "react";
import {
  ACCEPTED_UPLOAD_ACCEPT_ATTR,
  ACCEPTED_UPLOAD_EXTENSIONS,
  formatMaxUploadLabel,
  isSupportedUploadSelection,
  MAX_UPLOAD_BYTES,
} from "@/services/intakeConfig";

export type PendingFile = {
  file: File;
  status: "pending" | "uploading" | "done" | "error";
  progressPercent?: number;
  statusText?: string;
  className?: string;
  errorMsg?: string;
};

export type UploadBatchResult = {
  failedFiles: Array<{
    fileName: string;
    errorMsg: string;
    className?: string;
  }>;
};

export default function Composer({
  value,
  onChange,
  onSubmit,
  onFileUpload,
  disabled,
}: {
  value: string;
  onChange: (value: string) => void;
  onSubmit: () => void;
  onFileUpload?: (
    files: File[],
    hooks: {
      onFileProgress: (fileName: string, progressPercent: number) => void;
      onFileStatus: (fileName: string, statusText: string) => void;
      onBatchStatus: (statusText: string) => void;
    }
  ) => Promise<UploadBatchResult>;
  disabled?: boolean;
}) {
  const [pendingFiles, setPendingFiles] = useState<PendingFile[]>([]);
  const [dragging, setDragging] = useState(false);
  const [fileError, setFileError] = useState<string | null>(null);
  const [batchStatus, setBatchStatus] = useState<string>("Ready");
  const fileInputRef = useRef<HTMLInputElement>(null);
  const composingRef = useRef(false);

  const ACCEPTED = ACCEPTED_UPLOAD_ACCEPT_ATTR;

  async function submitComposer() {
    await handleSend();
  }

  function validateFile(f: File): string | null {
    if (f.size > MAX_UPLOAD_BYTES) {
      return `File too large (max ${formatMaxUploadLabel()}, got ${(f.size / 1024 / 1024).toFixed(1)} MB)`;
    }
    const ext = f.name.split(".").pop()?.toLowerCase() || "";
    if (!isSupportedUploadSelection(f)) {
      return `Unsupported file type: ${f.type || ext}`;
    }
    return null;
  }

  function handleFileSelected(nextFiles: FileList | File[]) {
    const fileArray = Array.from(nextFiles || []);
    if (fileArray.length === 0) {
      return;
    }

    const validFiles: PendingFile[] = [];
    const validationErrors: string[] = [];

    for (const file of fileArray) {
      const err = validateFile(file);
      if (err) {
        validationErrors.push(`${file.name}: ${err}`);
        continue;
      }
      validFiles.push({
        file,
        status: "pending",
        progressPercent: 0,
        statusText: "Ready",
      });
    }

    if (validationErrors.length > 0) {
      setFileError(validationErrors.join(" | "));
    } else {
      setFileError(null);
    }

    if (validFiles.length > 0) {
      setBatchStatus("Ready");
      setPendingFiles((prev) => [...prev, ...validFiles]);
    }
  }

  function handleDrop(e: DragEvent<HTMLDivElement>) {
    e.preventDefault();
    setDragging(false);
    const files = e.dataTransfer.files;
    if (files.length > 0) {
      handleFileSelected(files);
    }
  }

  function handleKeyDown(e: KeyboardEvent<HTMLTextAreaElement>) {
    if (composingRef.current) return; // skip during IME composition
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      void submitComposer();
    } else if (e.key === "Escape") {
      if (value.trim().length > 0) {
        onChange("");
      } else {
        e.currentTarget.blur();
      }
    }
  }

  async function handleSend() {
    if (disabled) return;
    const filesToUpload = pendingFiles.filter((pendingFile) => pendingFile.status === "pending").map((pendingFile) => pendingFile.file);
    const hadPendingFiles = filesToUpload.length > 0;

    if (hadPendingFiles && onFileUpload) {
      setPendingFiles((current) =>
        current.map((item) =>
          item.status === "pending"
            ? { ...item, status: "uploading", progressPercent: 0, statusText: "Queued" }
            : item
        )
      );
      setBatchStatus(`Uploading ${filesToUpload.length} file${filesToUpload.length === 1 ? "" : "s"}`);

      try {
        const result = await onFileUpload(filesToUpload, {
          onFileProgress: (fileName, progressPercent) => {
            setPendingFiles((current) =>
              current.map((item) =>
                item.file.name === fileName
                  ? { ...item, progressPercent, statusText: progressPercent < 100 ? `Uploading ${progressPercent}%` : "Upload received" }
                  : item
              )
            );
          },
          onFileStatus: (fileName, statusText) => {
            setPendingFiles((current) =>
              current.map((item) =>
                item.file.name === fileName ? { ...item, statusText } : item
              )
            );
          },
          onBatchStatus: (statusText) => {
            setBatchStatus(statusText);
          },
        });

        const failedByName = new Map(result.failedFiles.map((failed) => [failed.fileName, failed]));
        setPendingFiles((current) =>
          current.map((item) => {
            const failed = failedByName.get(item.file.name);
            if (failed) {
              return {
                ...item,
                status: "error",
                className: failed.className,
                errorMsg: failed.errorMsg,
                statusText: failed.className ? `Error (${failed.className})` : "Error",
              };
            }
            if (item.status === "uploading") {
              return {
                ...item,
                status: "done",
                progressPercent: 100,
                statusText: "Uploaded",
              };
            }
            return item;
          })
        );

        if (result.failedFiles.length > 0) {
          setBatchStatus(`Batch completed with ${result.failedFiles.length} failed file${result.failedFiles.length === 1 ? "" : "s"}`);
          return;
        }

        setBatchStatus("Batch upload + compile succeeded");
      } catch (err: any) {
        setBatchStatus("Batch failed");
        setFileError(String(err?.message || err));
        setPendingFiles((current) =>
          current.map((item) =>
            item.status === "uploading"
              ? { ...item, status: "error", errorMsg: String(err?.message || err), statusText: "Error" }
              : item
          )
        );
        return;
      }
    }
    if (value.trim() || hadPendingFiles) onSubmit();
  }

  const canSend = !disabled && (value.trim().length > 0 || pendingFiles.some((pendingFile) => pendingFile.status === "pending"));
  const isUploading = pendingFiles.some((pendingFile) => pendingFile.status === "uploading");
  const batchProgress = pendingFiles.length > 0
    ? Math.round(
        pendingFiles.reduce((sum, item) => {
          if (item.status === "done") return sum + 100;
          return sum + Number(item.progressPercent || 0);
        }, 0) / pendingFiles.length
      )
    : 0;

  return (
    <div
      onDragOver={(e) => { e.preventDefault(); setDragging(true); }}
      onDragLeave={() => setDragging(false)}
      onDrop={handleDrop}
      className={`composer ${dragging ? "is-dragging" : ""}`}
      aria-busy={disabled || isUploading}
    >
      {pendingFiles.length > 0 && (
        <div style={{ display: "grid", gap: 6, padding: "2px 0" }}>
          <div style={{ fontSize: 12, color: "var(--text-muted)", padding: "0 8px" }}>
            Batch: {pendingFiles.length} file{pendingFiles.length === 1 ? "" : "s"} selected. Status: {batchStatus}
          </div>
          {pendingFiles.map((pendingFile, index) => (
            <div className="composer-file-chip" key={`${pendingFile.file.name}_${pendingFile.file.size}_${index}`}>
              <span style={{ flex: 1, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                {pendingFile.file.name} ({(pendingFile.file.size / 1024).toFixed(0)} KB | {pendingFile.file.type || "unknown"})
              </span>
              <span style={{ color: pendingFile.status === "error" ? "var(--danger)" : pendingFile.status === "done" ? "var(--success)" : "var(--text-muted)" }}>
                {pendingFile.status === "uploading"
                  ? pendingFile.statusText || "Uploading"
                  : pendingFile.status === "done"
                  ? "Uploaded"
                  : pendingFile.status === "error"
                  ? `Error: ${pendingFile.errorMsg || pendingFile.statusText || "Failed"}`
                  : pendingFile.statusText || "Ready"}
              </span>
              {pendingFile.status !== "uploading" && (
                <button
                  aria-label={`Remove selected file ${pendingFile.file.name}`}
                  onClick={() => {
                    setPendingFiles((current) => current.filter((_, currentIndex) => currentIndex !== index));
                    setFileError(null);
                  }}
                  style={{ background: "none", border: "none", cursor: "pointer", color: "var(--text-muted)", fontSize: 14, padding: "0 2px" }}
                >
                  ✕
                </button>
              )}
            </div>
          ))}
        </div>
      )}
      {fileError && (
        <div style={{ fontSize: 12, color: "var(--danger)", padding: "2px 8px" }}>{fileError}</div>
      )}
      {isUploading && (
        <div style={{ padding: "2px 8px", fontSize: 12, color: "var(--text-muted)" }}>
          <div>Upload progress: {batchProgress}%</div>
          <div>Status: {batchStatus}</div>
        </div>
      )}
      <div className="composer-row">
        <input
          ref={fileInputRef}
          type="file"
          multiple
          accept={ACCEPTED}
          aria-label="Upload file"
          style={{ display: "none" }}
          onChange={(e) => { const files = e.target.files; if (files && files.length > 0) handleFileSelected(files); e.target.value = ""; }}
        />
        <button
          type="button"
          aria-label="Attach file"
          onClick={() => fileInputRef.current?.click()}
          disabled={disabled || isUploading}
           title={`Attach ${ACCEPTED_UPLOAD_EXTENSIONS.join(", ")}`}
           style={{ padding: "8px 10px", borderRadius: 10, border: "1px solid var(--border)", background: "var(--surface)", cursor: "pointer", fontSize: 13, color: "var(--text-muted)", fontWeight: 700 }}
        >
          Attach
        </button>
        <textarea
          value={value}
          onChange={(e) => onChange(e.target.value)}
          onKeyDown={handleKeyDown}
          onCompositionStart={() => { composingRef.current = true; }}
          onCompositionEnd={() => { composingRef.current = false; }}
          placeholder="Ask, command, paste spec text, or drop a URL (Enter to send, Shift+Enter for newline)"
          disabled={disabled || isUploading}
          aria-label="Compose message"
          rows={1}
          className="composer-textarea"
        />
        <button
          type="button"
          aria-label="Send message"
          onClick={() => {
            void submitComposer();
          }}
          disabled={!canSend || isUploading}
           style={{ padding: "8px 16px", borderRadius: 10, cursor: canSend && !isUploading ? "pointer" : "not-allowed", opacity: canSend && !isUploading ? 1 : 0.5, background: canSend ? "var(--accent)" : "var(--surface-strong)", color: canSend ? "#fff" : "var(--text-muted)", borderColor: canSend ? "var(--accent)" : "var(--border)" }}
        >
          {disabled || isUploading ? "Sending..." : "Send"}
        </button>
      </div>
      <div className="composer-help">
        Universal intake: files, repo URLs, cloud links, pasted specs, and local manifest JSON. Max upload: {formatMaxUploadLabel()}. Accepted: {ACCEPTED_UPLOAD_EXTENSIONS.join(", ")}. Live deployment remains approval-gated.
      </div>
      {dragging && (
        <div style={{ textAlign: "center", fontSize: 12, color: "var(--text-muted)", padding: "4px 0" }}>
          Drop files here
        </div>
      )}
    </div>
  );
}
