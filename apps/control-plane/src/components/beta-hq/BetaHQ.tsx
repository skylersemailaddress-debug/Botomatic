"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { getJsonSafe, postJson } from "@/services/api";
import { uploadIntakeFile, type FileIntakeResponse, type IntakeResponse } from "@/services/intake";
import { getProjectState, type ProjectStateResponse } from "@/services/projectState";
import { getProjectRuntimeState, type ProjectRuntimeState } from "@/services/runtimeStatus";
import { sendOperatorMessage } from "@/services/operator";

// ── Types ─────────────────────────────────────────────────────────────────

type StatusValue = "checking" | "ok" | "error" | "unknown";
type PipelineStatus = "waiting" | "running" | "done" | "failed";
type ChatRole = "user" | "system" | "error";

type ChatMsg = { id: number; role: ChatRole; text: string };
type UploadEntry = {
  file: File;
  progress: number;
  status: "pending" | "uploading" | "done" | "error";
  result?: FileIntakeResponse;
  error?: string;
};

// ── Pipeline ──────────────────────────────────────────────────────────────

const PIPELINE_LABELS = ["Intake", "Plan", "Build", "Validate", "Preview", "Launch"];

function derivePipelineStatus(
  label: string,
  projectId: string | null,
  state: ProjectStateResponse | null,
  runtime: ProjectRuntimeState | null,
): PipelineStatus {
  if (!projectId) return "waiting";
  const lower = label.toLowerCase();
  if (lower === "intake") return "done";
  const stages = state?.latestRun?.stages ?? state?.orchestration?.stages ?? (state as any)?.stages ?? [];
  const match = (stages as Array<{ label?: string; status?: string }>).find(
    (s) => (s.label ?? "").toLowerCase().includes(lower) || lower.includes((s.label ?? "").toLowerCase()),
  );
  if (match) {
    const st = (match.status ?? "").toLowerCase();
    if (st === "complete" || st === "done" || st === "completed") return "done";
    if (st === "running" || st === "queued" || st === "in_progress") return "running";
    if (st === "failed" || st === "blocked") return "failed";
  }
  if (lower === "preview" && (runtime?.verifiedPreviewUrl || runtime?.previewUrl || runtime?.derivedPreviewUrl)) return "done";
  if (lower === "launch" && (runtime?.status === "running" || runtime?.state === "running")) return "done";
  return "waiting";
}

function PipelineStep({ label, status }: { label: string; status: PipelineStatus }) {
  const icon = status === "done" ? "✓" : status === "running" ? "●" : status === "failed" ? "✕" : "○";
  return (
    <div className={`bhq-pipe-step bhq-pipe-step--${status}`} aria-label={`${label}: ${status}`}>
      <span className="bhq-pipe-icon" aria-hidden>{icon}</span>
      <span className="bhq-pipe-label">{label}</span>
    </div>
  );
}

// ── Status dot ────────────────────────────────────────────────────────────

function StatusDot({ status }: { status: StatusValue }) {
  const color =
    status === "ok" ? "var(--success, #147a4b)" :
    status === "error" ? "var(--danger, #b73737)" :
    status === "checking" ? "var(--pending, #8d6700)" :
    "var(--muted, #6d7f94)";
  return <span className="bhq-dot" style={{ background: color }} aria-hidden />;
}

// ── Main component ────────────────────────────────────────────────────────

export function BetaHQ({ projectId: initialProjectId }: { projectId?: string }) {
  // Status
  const [apiStatus, setApiStatus] = useState<StatusValue>("checking");
  const [readyStatus, setReadyStatus] = useState<StatusValue>("checking");
  const [projectId, setProjectId] = useState<string | null>(initialProjectId ?? null);
  const [projectState, setProjectState] = useState<ProjectStateResponse | null>(null);
  const [runtime, setRuntime] = useState<ProjectRuntimeState | null>(null);
  const [lastAction, setLastAction] = useState("--");
  const [projectStatus, setProjectStatus] = useState<string | null>(null);

  // Chat
  const [messages, setMessages] = useState<ChatMsg[]>([]);
  const [chatInput, setChatInput] = useState("");
  const [chatBusy, setChatBusy] = useState(false);
  const msgIdRef = useRef(0);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Upload
  const [uploads, setUploads] = useState<UploadEntry[]>([]);
  const [dragging, setDragging] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // ── Health checks ──────────────────────────────────────────────────────
  useEffect(() => {
    let active = true;
    getJsonSafe<unknown>("/api/health").then((r) => { if (active) setApiStatus(r.ok ? "ok" : "error"); });
    getJsonSafe<unknown>("/api/ready").then((r) => { if (active) setReadyStatus(r.ok ? "ok" : "error"); });
    return () => { active = false; };
  }, []);

  // ── Project state polling ──────────────────────────────────────────────
  useEffect(() => {
    if (!projectId) return;
    let active = true;
    const poll = async () => {
      const [stateRes, runtimeRes] = await Promise.all([
        getProjectState(projectId),
        getProjectRuntimeState(projectId),
      ]);
      if (!active) return;
      if (stateRes.ok) {
        setProjectState(stateRes.data);
        const status = (stateRes.data as any)?.status || stateRes.data?.latestRun?.status || null;
        if (status) setProjectStatus(status);
      }
      setRuntime(runtimeRes ?? null);
    };
    poll();
    const interval = setInterval(poll, 5000);
    return () => { active = false; clearInterval(interval); };
  }, [projectId]);

  // ── Scroll chat to bottom ──────────────────────────────────────────────
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const addMsg = useCallback((role: ChatRole, text: string) => {
    setMessages((prev) => [...prev, { id: ++msgIdRef.current, role, text }]);
  }, []);

  // ── Chat / intake submit ───────────────────────────────────────────────
  const handleChatSubmit = useCallback(async (e: React.FormEvent) => {
    e.preventDefault();
    const text = chatInput.trim();
    if (!text || chatBusy) return;
    setChatInput("");
    setChatBusy(true);
    addMsg("user", text);

    try {
      if (!projectId) {
        addMsg("system", "Creating project…");
        const result = await postJson<IntakeResponse>("/api/projects/intake", {
          name: text.slice(0, 60),
          request: text,
        });
        setProjectId(result.projectId);
        setProjectStatus("created");
        setLastAction(`Created ${result.projectId}`);
        addMsg("system", `Project created: ${result.projectId}`);
        // Update URL without re-mounting so state (messages, uploads) is preserved.
        if (typeof window !== "undefined") {
          window.history.replaceState(null, "", `/projects/${result.projectId}`);
        }
      } else {
        try {
          const result = await sendOperatorMessage(projectId, text);
          const reply = result.operatorMessage || result.nextAction || result.status || "Command accepted.";
          addMsg("system", reply);
          setLastAction(result.nextAction || "Command sent");
        } catch (err) {
          const msg = err instanceof Error ? err.message : String(err);
          if (msg.includes("404")) {
            addMsg("system", "Command endpoint not yet wired for this project. Command noted.");
          } else {
            addMsg("error", msg);
          }
        }
      }
    } catch (err) {
      addMsg("error", err instanceof Error ? err.message : "Request failed");
    } finally {
      setChatBusy(false);
    }
  }, [chatInput, chatBusy, projectId, addMsg]);

  // ── File upload ────────────────────────────────────────────────────────
  const addFiles = useCallback((files: FileList | File[]) => {
    setUploads((prev) => [
      ...prev,
      ...Array.from(files).map((f) => ({ file: f, progress: 0, status: "pending" as const })),
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
    if (!projectId) return;
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
  }, [projectId, uploads]);

  // ── Derived state ──────────────────────────────────────────────────────
  const pipeline = PIPELINE_LABELS.map((label) => ({
    label,
    status: derivePipelineStatus(label, projectId, projectState, runtime),
  }));

  const previewUrl =
    runtime?.verifiedPreviewUrl ||
    runtime?.previewUrl ||
    (runtime as any)?.derivedPreviewUrl ||
    null;

  const canLaunch = !!projectId && pipeline.slice(0, 4).every((s) => s.status === "done");
  const latestStep = projectState?.nextStep || projectState?.objective || null;
  const activity = (projectState as any)?.activity as Array<{ label?: string; type?: string; timestamp?: string }> | undefined;
  const recentActivity = activity?.slice(-4) ?? [];

  // ── Render ─────────────────────────────────────────────────────────────
  return (
    <div className="bhq-dash">

      {/* ── Header bar ── */}
      <header className="bhq-bar">
        <div className="bhq-bar-brand">
          <span className="bhq-bar-mark">B</span>
          <div>
            <div className="bhq-bar-title">Botomatic Beta HQ</div>
            <div className="bhq-bar-sub">Invite-only builder control plane</div>
          </div>
        </div>

        <div className="bhq-bar-status">
          <StatusDot status={apiStatus} />
          <span className="bhq-bar-lbl">API</span>
          <StatusDot status={readyStatus} />
          <span className="bhq-bar-lbl">Ready</span>
          {projectId && (
            <>
              <span className="bhq-bar-sep" aria-hidden>|</span>
              <span className="bhq-bar-proj" title={projectId}>
                {projectId.length > 22 ? `${projectId.slice(0, 22)}…` : projectId}
              </span>
              {projectStatus && (
                <span className={`bhq-bar-pill bhq-bar-pill--${projectStatus}`}>{projectStatus}</span>
              )}
            </>
          )}
          <span className="bhq-bar-sep" aria-hidden>|</span>
          <span className="bhq-bar-last" title={lastAction}>{lastAction}</span>
        </div>

        <span className="bhq-bar-beta">Friends &amp; family beta</span>
      </header>

      {/* ── Main grid ── */}
      <div className="bhq-grid">

        {/* Left column: chat + uploader */}
        <div className="bhq-col bhq-col--left">

          {/* Chat / command */}
          <section className="bhq-card bhq-chat" aria-label="Build command">
            <div className="bhq-card-head">Build</div>
            <div className="bhq-msgs" aria-live="polite" aria-atomic="false">
              {messages.length === 0 && (
                <div className="bhq-msgs-empty">
                  {projectId
                    ? "Project loaded. Tell Botomatic what to build or change next."
                    : "Describe what you want to build to get started."}
                </div>
              )}
              {messages.map((m) => (
                <div key={m.id} className={`bhq-msg bhq-msg--${m.role}`}>
                  <span className="bhq-msg-role">
                    {m.role === "user" ? "You" : m.role === "error" ? "Error" : "Botomatic"}
                  </span>
                  <span className="bhq-msg-text">{m.text}</span>
                </div>
              ))}
              <div ref={messagesEndRef} />
            </div>
            <form className="bhq-chat-form" onSubmit={(e) => void handleChatSubmit(e)}>
              <textarea
                className="bhq-chat-input"
                placeholder={
                  projectId
                    ? "Tell Botomatic what to build or change…"
                    : "Describe what you want to build…"
                }
                value={chatInput}
                onChange={(e) => setChatInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); void handleChatSubmit(e as unknown as React.FormEvent); }
                }}
                disabled={chatBusy}
                rows={2}
              />
              <button
                type="submit"
                className="bhq-chat-send"
                disabled={chatBusy || !chatInput.trim()}
                aria-label="Send"
              >
                {chatBusy ? "…" : "Send"}
              </button>
            </form>
          </section>

          {/* File uploader */}
          <section className="bhq-card bhq-upload-panel" aria-label="File upload">
            <div className="bhq-card-head">Attach files</div>
            {!projectId && (
              <p className="bhq-upload-note">Create a project first, then attach files.</p>
            )}
            <div
              className={`bhq-drop${dragging ? " bhq-drop--active" : ""}`}
              onDragOver={(e) => { e.preventDefault(); setDragging(true); }}
              onDragLeave={() => setDragging(false)}
              onDrop={handleDrop}
              onClick={() => fileInputRef.current?.click()}
              role="button"
              tabIndex={0}
              aria-label="Drop files here or click to select"
              onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") fileInputRef.current?.click(); }}
            >
              <span aria-hidden>⬆</span>
              <span>Drop or <u>click to select</u></span>
              <span className="bhq-drop-sub">PDF, ZIP, source files</span>
            </div>
            <input
              ref={fileInputRef}
              type="file"
              multiple
              style={{ display: "none" }}
              onChange={handleFileChange}
            />
            {uploads.length > 0 && (
              <div className="bhq-upload-list">
                {uploads.map((u, i) => (
                  <div key={i} className={`bhq-upload-item bhq-upload-item--${u.status}`}>
                    <span className="bhq-upload-name" title={u.file.name}>{u.file.name}</span>
                    <span className="bhq-upload-meta">
                      {u.status === "uploading"
                        ? `${u.progress}%`
                        : u.status === "done"
                        ? "✓"
                        : u.status === "error"
                        ? "✕"
                        : `${(u.file.size / 1024).toFixed(0)} KB`}
                    </span>
                    {u.status === "error" && (
                      <span className="bhq-upload-err" title={u.error}>Error</span>
                    )}
                    {u.status === "pending" && (
                      <button
                        type="button"
                        className="bhq-upload-rm"
                        aria-label={`Remove ${u.file.name}`}
                        onClick={(e) => { e.stopPropagation(); removeUpload(i); }}
                      >✕</button>
                    )}
                  </div>
                ))}
                <div className="bhq-upload-actions">
                  <button
                    type="button"
                    className="bhq-btn bhq-btn--primary"
                    disabled={!projectId || !uploads.some((u) => u.status === "pending")}
                    onClick={() => void handleUpload()}
                  >
                    Upload
                  </button>
                  <button type="button" className="bhq-btn" onClick={clearUploads}>Clear</button>
                </div>
              </div>
            )}
          </section>
        </div>

        {/* Right column: progress + preview + launch + logs */}
        <div className="bhq-col bhq-col--right">

          {/* Build progress */}
          <section className="bhq-card bhq-progress-panel" aria-label="Build progress">
            <div className="bhq-card-head">Build progress</div>
            <div className="bhq-pipeline">
              {pipeline.map((step) => (
                <PipelineStep key={step.label} label={step.label} status={step.status} />
              ))}
            </div>
          </section>

          {/* Preview / status */}
          <section className="bhq-card bhq-preview-panel" aria-label="Preview and status">
            <div className="bhq-card-head">Preview / status</div>
            {!projectId ? (
              <p className="bhq-preview-placeholder">
                Preview will appear here as Botomatic materializes the app.
              </p>
            ) : (
              <div className="bhq-preview-body">
                {projectStatus && (
                  <span className={`bhq-status-pill bhq-status-pill--${projectStatus}`}>
                    {projectStatus}
                  </span>
                )}
                {latestStep ? (
                  <p className="bhq-preview-step">{latestStep}</p>
                ) : (
                  <p className="bhq-preview-placeholder">
                    Preview will appear here as Botomatic materializes the app.
                  </p>
                )}
                {previewUrl && (
                  <a
                    href={previewUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="bhq-btn bhq-btn--primary"
                    style={{ marginTop: 10, display: "inline-block" }}
                  >
                    Open preview ↗
                  </a>
                )}
              </div>
            )}
          </section>

          {/* Launch controls */}
          <section className="bhq-card bhq-launch-panel" aria-label="Launch controls">
            <div className="bhq-card-head">Launch</div>
            <div className="bhq-launch-row">
              <button
                type="button"
                className="bhq-btn"
                onClick={async () => {
                  setLastAction("Checking readiness…");
                  const r = await getJsonSafe<unknown>("/api/ready");
                  setLastAction(r.ok ? "Readiness: OK" : "Readiness: not ready");
                }}
              >
                Validate
              </button>
              <Link
                href="/api/local-repo-dashboard"
                className="bhq-btn"
                target="_blank"
                rel="noopener noreferrer"
              >
                Evidence
              </Link>
              {previewUrl ? (
                <a
                  href={previewUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="bhq-btn"
                >
                  Runtime
                </a>
              ) : (
                <button
                  type="button"
                  className="bhq-btn"
                  disabled
                  title="No preview URL available yet"
                  aria-label="Runtime — no preview URL available yet"
                >
                  Runtime
                </button>
              )}
              <button
                type="button"
                className="bhq-btn bhq-btn--launch"
                disabled={!canLaunch}
                title={canLaunch ? "Launch the app" : "Complete all build stages before launching"}
                aria-label={canLaunch ? "Launch app" : "Launch disabled until build stages complete"}
              >
                Launch
              </button>
            </div>
            {!canLaunch && projectId && (
              <p className="bhq-launch-note">
                Complete Intake → Plan → Build → Validate to enable launch.
              </p>
            )}
          </section>

          {/* Activity / logs */}
          <section className="bhq-card bhq-logs-panel" aria-label="Recent activity">
            <div className="bhq-card-head">Activity</div>
            {recentActivity.length === 0 ? (
              <p className="bhq-logs-empty">No recent activity.</p>
            ) : (
              <div className="bhq-logs-list">
                {recentActivity.map((entry, i) => (
                  <div key={i} className="bhq-log-row">
                    <span className="bhq-log-label">{entry.label ?? entry.type ?? "event"}</span>
                    {entry.timestamp && (
                      <span className="bhq-log-time">
                        {new Date(entry.timestamp).toLocaleTimeString()}
                      </span>
                    )}
                  </div>
                ))}
              </div>
            )}
          </section>
        </div>
      </div>

      <footer className="bhq-footer">
        Friends-and-family beta. Use low-risk project data. Not public launch.
      </footer>
    </div>
  );
}
