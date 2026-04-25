"use client";

import { useRef, useState, DragEvent, KeyboardEvent } from "react";

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
  onFileUpload?: (file: File) => Promise<void>;
  disabled?: boolean;
}) {
  const [pendingFile, setPendingFile] = useState<PendingFile | null>(null);
  const [dragging, setDragging] = useState(false);
  const [fileError, setFileError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const composingRef = useRef(false);

  const MAX_BYTES = 10 * 1024 * 1024;
  const ACCEPTED = ".txt,.md,.json,.csv,.pdf";
  const ACCEPTED_TYPES = ["text/plain", "text/markdown", "application/json", "text/csv",
    "application/pdf"];

  async function submitComposer() {
    await handleSend();
  }

  function validateFile(f: File): string | null {
    if (f.size > MAX_BYTES) return `File too large (max 10 MB, got ${(f.size / 1024 / 1024).toFixed(1)} MB)`;
    const ext = f.name.split(".").pop()?.toLowerCase() || "";
    if (!ACCEPTED_TYPES.includes(f.type) && !["txt", "md", "json", "csv", "pdf"].includes(ext)) {
      return `Unsupported file type: ${f.type || ext}`;
    }
    return null;
  }

  function handleFileSelected(f: File) {
    const err = validateFile(f);
    if (err) { setFileError(err); return; }
    setFileError(null);
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
      try {
        await onFileUpload(pendingFile.file);
        setPendingFile((p) => p ? { ...p, status: "done" } : p);
      } catch (err: any) {
        setPendingFile((p) => p ? { ...p, status: "error", errorMsg: String(err?.message || err) } : p);
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
      style={{
        display: "flex",
        flexDirection: "column",
        gap: 8,
        padding: 10,
        borderRadius: 16,
        background: "var(--panel-soft)",
        border: dragging ? "2px dashed var(--accent, #6366f1)" : "1px solid var(--border)",
        transition: "border 0.15s",
      }}
      aria-busy={disabled || isUploading}
    >
      {pendingFile && (
        <div style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 12, padding: "4px 8px", borderRadius: 8, background: "var(--bg-elevated)", border: "1px solid var(--border)" }}>
          <span style={{ flex: 1, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
            File: {pendingFile.file.name} ({(pendingFile.file.size / 1024).toFixed(0)} KB | {pendingFile.file.type || "unknown"})
          </span>
          <span style={{ color: pendingFile.status === "error" ? "var(--error, #ef4444)" : pendingFile.status === "done" ? "var(--success, #22c55e)" : "var(--text-muted)" }}>
            {pendingFile.status === "uploading" ? "Uploading..." : pendingFile.status === "done" ? "Uploaded" : pendingFile.status === "error" ? `Error: ${pendingFile.errorMsg}` : "Ready"}
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
        <div style={{ fontSize: 12, color: "var(--error, #ef4444)", padding: "2px 8px" }}>{fileError}</div>
      )}
      <div style={{ display: "flex", gap: 8 }}>
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
          title="Attach .txt, .md, .json, .csv, .pdf"
          style={{ padding: "8px 10px", borderRadius: 10, border: "1px solid var(--border)", background: "var(--bg-elevated)", cursor: "pointer", fontSize: 16, color: "var(--text-muted)" }}
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
          style={{
            flex: 1,
            padding: "10px 12px",
            borderRadius: 10,
            border: "1px solid var(--border)",
            background: "var(--bg-elevated)",
            color: "var(--text)",
            outline: "none",
            resize: "vertical",
            minHeight: 40,
            fontFamily: "inherit",
            fontSize: "inherit",
          }}
        />
        <button
          type="button"
          aria-label="Send message"
          onClick={() => {
            void submitComposer();
          }}
          disabled={!canSend || isUploading}
          style={{ padding: "8px 16px", borderRadius: 10, cursor: canSend && !isUploading ? "pointer" : "not-allowed", opacity: canSend && !isUploading ? 1 : 0.5 }}
        >
          {disabled || isUploading ? "Sending..." : "Send"}
        </button>
      </div>
      {dragging && (
        <div style={{ textAlign: "center", fontSize: 12, color: "var(--text-muted)", padding: "4px 0" }}>
          Drop file here
        </div>
      )}
    </div>
  );
}
