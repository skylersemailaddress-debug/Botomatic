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
  errorMsg?: string;
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
    file: File,
    hooks: {
      onUploadProgress: (progressPercent: number) => void;
      onStatus: (statusText: string) => void;
    }
  ) => Promise<void>;
  disabled?: boolean;
}) {
  const [pendingFile, setPendingFile] = useState<PendingFile | null>(null);
  const [dragging, setDragging] = useState(false);
  const [fileError, setFileError] = useState<string | null>(null);
  const [uploadProgress, setUploadProgress] = useState<number>(0);
  const [uploadStatus, setUploadStatus] = useState<string>("Ready");
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

  function handleFileSelected(f: File) {
    const err = validateFile(f);
    if (err) { setFileError(err); return; }
    setFileError(null);
    setUploadProgress(0);
    setUploadStatus("Ready");
    setPendingFile({ file: f, status: "pending" });
  }

  function handleDrop(e: DragEvent<HTMLDivElement>) {
    e.preventDefault();
    setDragging(false);
    const f = e.dataTransfer.files[0];
    if (f) handleFileSelected(f);
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
    const hadPendingFile = pendingFile && pendingFile.status === "pending";
    if (pendingFile && pendingFile.status === "pending" && onFileUpload) {
      setPendingFile((p) => p ? { ...p, status: "uploading" } : p);
      setUploadProgress(0);
      setUploadStatus("Uploading");
      try {
        await onFileUpload(pendingFile.file, {
          onUploadProgress: (progressPercent) => {
            setUploadProgress(progressPercent);
            setUploadStatus(progressPercent < 100 ? `Uploading ${progressPercent}%` : "Upload received; validating");
          },
          onStatus: (statusText) => {
            setUploadStatus(statusText);
          },
        });
        setPendingFile((p) => p ? { ...p, status: "done" } : p);
        setUploadStatus("Uploaded");
      } catch (err: any) {
        setPendingFile((p) => p ? { ...p, status: "error", errorMsg: String(err?.message || err) } : p);
        setUploadStatus("Error");
        return;
      }
    }
    if (value.trim() || hadPendingFile) onSubmit();
  }

  const canSend = !disabled && (value.trim().length > 0 || (pendingFile != null && pendingFile.status === "pending"));
  const isUploading = pendingFile?.status === "uploading";

  return (
    <div
      onDragOver={(e) => { e.preventDefault(); setDragging(true); }}
      onDragLeave={() => setDragging(false)}
      onDrop={handleDrop}
      className={`composer ${dragging ? "is-dragging" : ""}`}
      aria-busy={disabled || isUploading}
    >
      {pendingFile && (
        <div className="composer-file-chip">
          <span style={{ flex: 1, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
            File: {pendingFile.file.name} ({(pendingFile.file.size / 1024).toFixed(0)} KB | {pendingFile.file.type || "unknown"})
          </span>
          <span style={{ color: pendingFile.status === "error" ? "var(--danger)" : pendingFile.status === "done" ? "var(--success)" : "var(--text-muted)" }}>
            {pendingFile.status === "uploading"
              ? uploadStatus
              : pendingFile.status === "done"
              ? "Uploaded"
              : pendingFile.status === "error"
              ? `Error: ${pendingFile.errorMsg}`
              : "Ready"}
          </span>
          {pendingFile.status !== "uploading" && (
            <button
              aria-label="Remove selected file"
              onClick={() => { setPendingFile(null); setFileError(null); }}
              style={{ background: "none", border: "none", cursor: "pointer", color: "var(--text-muted)", fontSize: 14, padding: "0 2px" }}
            >
              ✕
            </button>
          )}
        </div>
      )}
      {fileError && (
        <div style={{ fontSize: 12, color: "var(--danger)", padding: "2px 8px" }}>{fileError}</div>
      )}
      {pendingFile?.status === "uploading" && (
        <div style={{ padding: "2px 8px", fontSize: 12, color: "var(--text-muted)" }}>
          <div>Upload progress: {uploadProgress}%</div>
          <div>Status: {uploadStatus}</div>
        </div>
      )}
      <div className="composer-row">
        <input
          ref={fileInputRef}
          type="file"
          accept={ACCEPTED}
          aria-label="Upload file"
          style={{ display: "none" }}
          onChange={(e) => { const f = e.target.files?.[0]; if (f) handleFileSelected(f); e.target.value = ""; }}
        />
        <button
          type="button"
          aria-label="Attach file"
          onClick={() => fileInputRef.current?.click()}
          disabled={disabled || isUploading}
           title={`Attach ${ACCEPTED_UPLOAD_EXTENSIONS.join(", ")}`}
           style={{ padding: "8px 10px", borderRadius: 10, border: "1px solid var(--border)", background: "var(--surface)", cursor: "pointer", fontSize: 13, color: "var(--text-muted)", fontWeight: 700 }}
        >
          Upload
        </button>
        <textarea
          value={value}
          onChange={(e) => onChange(e.target.value)}
          onKeyDown={handleKeyDown}
          onCompositionStart={() => { composingRef.current = true; }}
          onCompositionEnd={() => { composingRef.current = false; }}
          placeholder="Describe what you want Botomatic to build or fix (Enter to send, Shift+Enter for newline)"
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
        Max upload: {formatMaxUploadLabel()}. Accepted: {ACCEPTED_UPLOAD_EXTENSIONS.join(", ")}. Live deployment remains approval-gated.
      </div>
      {dragging && (
        <div style={{ textAlign: "center", fontSize: 12, color: "var(--text-muted)", padding: "4px 0" }}>
          Drop file here
        </div>
      )}
    </div>
  );
}
