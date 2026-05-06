"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { getJsonSafe, postJson } from "@/services/api";
import { uploadIntakeFile, type FileIntakeResponse, type IntakeResponse } from "@/services/intake";

type StatusValue = "checking" | "ok" | "error" | "unknown";

type StatusCard = {
  label: string;
  value: string;
  status: StatusValue;
};

type UploadEntry = {
  file: File;
  progress: number;
  status: "pending" | "uploading" | "done" | "error";
  result?: FileIntakeResponse;
  error?: string;
};

function StatusDot({ status }: { status: StatusValue }) {
  const color =
    status === "ok" ? "var(--success)" :
    status === "error" ? "var(--danger)" :
    status === "checking" ? "var(--pending)" :
    "var(--muted)";
  return (
    <span
      className="bhq-status-dot"
      style={{ background: color }}
      aria-label={status}
    />
  );
}

export function BetaHQ() {
  const [apiStatus, setApiStatus] = useState<StatusValue>("checking");
  const [readyStatus, setReadyStatus] = useState<StatusValue>("checking");
  const [currentProjectId, setCurrentProjectId] = useState<string | null>(null);
  const [lastAction, setLastAction] = useState<string>("--");

  // Intake form
  const [buildName, setBuildName] = useState("");
  const [buildPrompt, setBuildPrompt] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [intakeError, setIntakeError] = useState<string | null>(null);
  const [intakeResult, setIntakeResult] = useState<IntakeResponse | null>(null);

  // File upload
  const [uploads, setUploads] = useState<UploadEntry[]>([]);
  const [dragging, setDragging] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Status checks
  useEffect(() => {
    let active = true;
    getJsonSafe<{ status: string }>("/api/health").then((r) => {
      if (!active) return;
      setApiStatus(r.ok ? "ok" : "error");
    });
    getJsonSafe<{ ready: boolean; status: string }>("/api/ready").then((r) => {
      if (!active) return;
      setReadyStatus(r.ok ? "ok" : "error");
    });
    return () => { active = false; };
  }, []);

  const statusCards: StatusCard[] = [
    { label: "API", value: apiStatus === "checking" ? "Checking…" : apiStatus === "ok" ? "Online" : "Unreachable", status: apiStatus },
    { label: "Readiness", value: readyStatus === "checking" ? "Checking…" : readyStatus === "ok" ? "Ready" : "Not ready", status: readyStatus },
    { label: "Current project", value: currentProjectId ?? "None", status: currentProjectId ? "ok" : "unknown" },
    { label: "Last action", value: lastAction, status: "unknown" },
  ];

  // Intake submit
  const handleIntakeSubmit = useCallback(async (e: React.FormEvent) => {
    e.preventDefault();
    const name = buildName.trim() || "Untitled build";
    const request = buildPrompt.trim();
    if (!request) return;
    setSubmitting(true);
    setIntakeError(null);
    setIntakeResult(null);
    try {
      const result = await postJson<IntakeResponse>("/api/projects/intake", { name, request });
      setIntakeResult(result);
      setCurrentProjectId(result.projectId);
      setLastAction(`Created project ${result.projectId}`);
    } catch (err) {
      setIntakeError(err instanceof Error ? err.message : "Failed to create project");
    } finally {
      setSubmitting(false);
    }
  }, [buildName, buildPrompt]);

  // File selection
  const addFiles = useCallback((files: FileList | File[]) => {
    const list = Array.from(files);
    setUploads((prev) => [
      ...prev,
      ...list.map((f) => ({ file: f, progress: 0, status: "pending" as const })),
    ]);
  }, []);

  const handleFileChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files?.length) addFiles(e.target.files);
    e.target.value = "";
  }, [addFiles]);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setDragging(false);
    if (e.dataTransfer.files.length) addFiles(e.dataTransfer.files);
  }, [addFiles]);

  const removeUpload = useCallback((idx: number) => {
    setUploads((prev) => prev.filter((_, i) => i !== idx));
  }, []);

  const clearUploads = useCallback(() => setUploads([]), []);

  const handleUpload = useCallback(async () => {
    const projectId = currentProjectId;
    if (!projectId) {
      setIntakeError("Create a project first before uploading files.");
      return;
    }
    const pending = uploads.filter((u) => u.status === "pending");
    if (!pending.length) return;

    for (let i = 0; i < uploads.length; i++) {
      if (uploads[i].status !== "pending") continue;
      setUploads((prev) => prev.map((u, j) => j === i ? { ...u, status: "uploading" } : u));
      try {
        const result = await uploadIntakeFile(projectId, uploads[i].file, {
          onUploadProgress: (pct) => {
            setUploads((prev) => prev.map((u, j) => j === i ? { ...u, progress: pct } : u));
          },
        });
        setUploads((prev) => prev.map((u, j) => j === i ? { ...u, status: "done", progress: 100, result } : u));
        setLastAction(`Uploaded ${uploads[i].file.name}`);
      } catch (err) {
        const msg = err instanceof Error ? err.message : "Upload failed";
        setUploads((prev) => prev.map((u, j) => j === i ? { ...u, status: "error", error: msg } : u));
      }
    }
  }, [currentProjectId, uploads]);

  const activeProjId = intakeResult?.projectId ?? currentProjectId;

  return (
    <div className="bhq-page">
      <header className="bhq-header">
        <div className="bhq-header-brand">
          <span className="bhq-brand-mark">B</span>
          <div>
            <div className="bhq-title">Botomatic Beta HQ</div>
            <div className="bhq-subtitle">Invite-only builder control plane</div>
          </div>
        </div>
        <div className="bhq-beta-badge">Friends &amp; family beta</div>
      </header>

      {/* Status cards */}
      <section className="bhq-status-row" aria-label="System status">
        {statusCards.map((card) => (
          <div key={card.label} className="bhq-status-card">
            <div className="bhq-status-card-label">
              <StatusDot status={card.status} />
              {card.label}
            </div>
            <div className="bhq-status-card-value">{card.value}</div>
          </div>
        ))}
      </section>

      {/* Action buttons */}
      <section className="bhq-actions" aria-label="Quick actions">
        <button
          type="button"
          className="bhq-action-btn bhq-action-btn--primary"
          onClick={() => { setBuildName(""); setBuildPrompt(""); setIntakeResult(null); setIntakeError(null); }}
        >
          + New build
        </button>
        <button
          type="button"
          className="bhq-action-btn"
          onClick={() => fileInputRef.current?.click()}
        >
          Upload files
        </button>
        {activeProjId && (
          <Link href={`/projects/${activeProjId}`} className="bhq-action-btn bhq-action-btn--link">
            Open project dashboard
          </Link>
        )}
        <button
          type="button"
          className="bhq-action-btn"
          onClick={async () => {
            setLastAction("Running validation…");
            const r = await getJsonSafe<unknown>("/api/ready");
            setLastAction(r.ok ? "Validation: ready" : "Validation: not ready");
          }}
        >
          Run validation
        </button>
        {activeProjId && (
          <Link href={`/projects/${activeProjId}?panel=runtime`} className="bhq-action-btn bhq-action-btn--link">
            View runtime
          </Link>
        )}
        <Link href="/api/local-repo-dashboard" className="bhq-action-btn bhq-action-btn--link" target="_blank" rel="noopener noreferrer">
          View evidence
        </Link>
      </section>

      <div className="bhq-body">
        {/* Left: intake + upload */}
        <div className="bhq-left">
          {/* Intake form */}
          <section className="bhq-card" aria-label="New build intake">
            <h2 className="bhq-card-title">New build</h2>
            <form onSubmit={(e) => void handleIntakeSubmit(e)} className="bhq-form">
              <label className="bhq-label" htmlFor="bhq-name">Project / build name</label>
              <input
                id="bhq-name"
                type="text"
                className="bhq-input"
                placeholder="My SaaS app"
                value={buildName}
                onChange={(e) => setBuildName(e.target.value)}
                disabled={submitting}
                maxLength={120}
              />
              <label className="bhq-label" htmlFor="bhq-prompt">Description / prompt</label>
              <textarea
                id="bhq-prompt"
                className="bhq-textarea"
                placeholder="Describe what you want to build…"
                value={buildPrompt}
                onChange={(e) => setBuildPrompt(e.target.value)}
                disabled={submitting}
                rows={4}
              />
              {intakeError && <p className="bhq-error">{intakeError}</p>}
              <button
                type="submit"
                className="bhq-submit"
                disabled={submitting || !buildPrompt.trim()}
              >
                {submitting ? "Creating…" : "Create build"}
              </button>
            </form>
          </section>

          {/* File upload */}
          <section className="bhq-card" aria-label="File upload">
            <h2 className="bhq-card-title">Upload files</h2>
            {!currentProjectId && (
              <p className="bhq-upload-hint">Create a project first, then upload files.</p>
            )}
            <div
              className={`bhq-dropzone${dragging ? " bhq-dropzone--active" : ""}`}
              onDragOver={(e) => { e.preventDefault(); setDragging(true); }}
              onDragLeave={() => setDragging(false)}
              onDrop={handleDrop}
              onClick={() => fileInputRef.current?.click()}
              role="button"
              tabIndex={0}
              aria-label="Drop files here or click to select"
              onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") fileInputRef.current?.click(); }}
            >
              <span className="bhq-dropzone-icon">⬆</span>
              <span>Drop files here or <u>click to select</u></span>
              <span className="bhq-dropzone-sub">PDF, ZIP, source files</span>
            </div>
            <input
              ref={fileInputRef}
              type="file"
              multiple
              style={{ display: "none" }}
              onChange={handleFileChange}
            />

            {uploads.length > 0 && (
              <div className="bhq-file-list">
                {uploads.map((u, i) => (
                  <div key={i} className={`bhq-file-item bhq-file-item--${u.status}`}>
                    <span className="bhq-file-name" title={u.file.name}>{u.file.name}</span>
                    <span className="bhq-file-size">{(u.file.size / 1024).toFixed(0)} KB</span>
                    {u.status === "uploading" && (
                      <span className="bhq-file-progress">{u.progress}%</span>
                    )}
                    {u.status === "done" && <span className="bhq-file-done">Done</span>}
                    {u.status === "error" && (
                      <span className="bhq-file-error" title={u.error}>Error</span>
                    )}
                    {u.status === "pending" && (
                      <button
                        type="button"
                        className="bhq-file-remove"
                        aria-label={`Remove ${u.file.name}`}
                        onClick={(e) => { e.stopPropagation(); removeUpload(i); }}
                      >
                        ✕
                      </button>
                    )}
                  </div>
                ))}
                <div className="bhq-file-actions">
                  <button
                    type="button"
                    className="bhq-submit"
                    disabled={!currentProjectId || !uploads.some((u) => u.status === "pending")}
                    onClick={() => void handleUpload()}
                  >
                    Upload {uploads.filter((u) => u.status === "pending").length || ""} file(s)
                  </button>
                  <button type="button" className="bhq-action-btn" onClick={clearUploads}>
                    Clear all
                  </button>
                </div>
              </div>
            )}
          </section>
        </div>

        {/* Right: result panel */}
        <div className="bhq-right">
          <section className="bhq-card bhq-result-panel" aria-label="Result">
            <h2 className="bhq-card-title">Result</h2>
            {!intakeResult && !uploads.some((u) => u.status !== "pending") && (
              <p className="bhq-result-empty">Create a build or upload files to see results here.</p>
            )}

            {intakeResult && (
              <div className="bhq-result-block">
                <div className="bhq-result-row">
                  <span className="bhq-result-label">Project ID</span>
                  <code className="bhq-result-value">{intakeResult.projectId}</code>
                </div>
                <div className="bhq-result-row">
                  <span className="bhq-result-label">Status</span>
                  <span className="bhq-result-value">{intakeResult.status}</span>
                </div>
                <div className="bhq-result-row">
                  <span className="bhq-result-label">Actor</span>
                  <span className="bhq-result-value">{intakeResult.actorId}</span>
                </div>
                <Link
                  href={`/projects/${intakeResult.projectId}`}
                  className="bhq-submit"
                  style={{ display: "block", textAlign: "center", marginTop: 12 }}
                >
                  Open project dashboard →
                </Link>
              </div>
            )}

            {uploads.filter((u) => u.status === "done" || u.status === "error").map((u, i) => (
              <div key={i} className="bhq-result-block">
                <div className="bhq-result-row">
                  <span className="bhq-result-label">File</span>
                  <span className="bhq-result-value">{u.file.name}</span>
                </div>
                {u.status === "done" && u.result && (
                  <>
                    <div className="bhq-result-row">
                      <span className="bhq-result-label">Artifact ID</span>
                      <code className="bhq-result-value">{u.result.artifactId}</code>
                    </div>
                    <div className="bhq-result-row">
                      <span className="bhq-result-label">Extracted chars</span>
                      <span className="bhq-result-value">{u.result.extractedChars.toLocaleString()}</span>
                    </div>
                    {u.result.parseError && (
                      <div className="bhq-result-row">
                        <span className="bhq-result-label">Parse note</span>
                        <span className="bhq-result-value bhq-result-warn">{u.result.parseError}</span>
                      </div>
                    )}
                  </>
                )}
                {u.status === "error" && (
                  <p className="bhq-error">{u.error}</p>
                )}
              </div>
            ))}
          </section>
        </div>
      </div>

      <footer className="bhq-footer">
        Friends-and-family beta. Use low-risk project data. Not public launch.
      </footer>
    </div>
  );
}
