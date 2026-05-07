"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { getJsonSafe, postJson } from "@/services/api";
import { uploadIntakeFile, type FileIntakeResponse, type IntakeResponse } from "@/services/intake";
import { getProjectState, type ProjectStateResponse } from "@/services/projectState";
import { getProjectRuntimeState, type ProjectRuntimeState } from "@/services/runtimeStatus";
import { sendOperatorMessage } from "@/services/operator";
import type { SpecQuestion } from "@/types/readiness";

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
type BuildStartResponse = {
  projectId?: string;
  status?: string;
  jobId?: string | null;
  nextStep?: string | null;
  message?: string;
  error?: string;
  raw?: unknown;
  readyToBuild?: boolean;
  lockedReason?: string;
  blockingQuestions?: BlockingQuestion[];
  canUseRecommendedDefaults?: boolean;
  recommendedDefaults?: DecisionEntry[];
  missingArtifacts?: string[];
};

// BlockingQuestion is an alias for the canonical SpecQuestion type.
// Do not redefine locally — import SpecQuestion from @/types/readiness instead.
type BlockingQuestion = SpecQuestion;

type DecisionEntry = {
  id: string;
  label: string;
  plainEnglish: string;
  recommendedDefault: string | null;
};

type ReadinessState = {
  readyToBuild: boolean;
  readinessScore: number;
  status: string;
  lockedReason: string | null;
  blockingQuestions: BlockingQuestion[];
  canUseRecommendedDefaults: boolean;
  missingArtifacts: string[];
};

// ── Pipeline ──────────────────────────────────────────────────────────────

const PIPELINE_LABELS = ["Intake", "Plan", "Build", "Validate", "Preview", "Launch"];

// ── Internal string sanitization ──────────────────────────────────────────

const BLOCKED_INTERNAL_STRINGS = [
  "pageRoot",
  "component ·",
  "componentRender",
  "Awaiting edit command",
  "dry-run only",
  "adapter unavailable",
  "blocked-until-real-project",
];

function sanitize(text: string | null | undefined): string | null {
  if (!text) return null;
  let out = text;
  for (const s of BLOCKED_INTERNAL_STRINGS) {
    if (out.includes(s)) {
      out = out.split(s).join("[…]");
    }
  }
  return out;
}

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

// ── Build readiness panel ──────────────────────────────────────────────────

function BuildReadinessPanel({
  projectId,
  readiness,
  onUseDefaults,
  onAnswerQuestion,
  defaultsBusy,
}: {
  projectId: string;
  readiness: ReadinessState;
  onUseDefaults: () => void;
  onAnswerQuestion: (q: BlockingQuestion) => void;
  defaultsBusy: boolean;
}) {
  if (readiness.readyToBuild) {
    return (
      <div className="bhq-readiness bhq-readiness--ready" aria-label="Build readiness">
        <div className="bhq-readiness-score">
          <span className="bhq-readiness-label">Ready to build</span>
          <span className="bhq-readiness-pct">{readiness.readinessScore}%</span>
        </div>
      </div>
    );
  }

  return (
    <div className="bhq-readiness bhq-readiness--locked" aria-label="Build readiness">
      <div className="bhq-readiness-score">
        <span className="bhq-readiness-label">Build locked</span>
        <span className="bhq-readiness-pct">{readiness.readinessScore}%</span>
      </div>
      {readiness.lockedReason && (
        <p className="bhq-readiness-reason">{readiness.lockedReason}</p>
      )}

      {readiness.missingArtifacts.length > 0 && (
        <div className="bhq-readiness-missing">
          <p className="bhq-readiness-missing-msg">
            I do not see an uploaded file yet. Upload it now or build from your description.
          </p>
        </div>
      )}

      {readiness.blockingQuestions.length > 0 && (
        <div className="bhq-readiness-questions">
          {readiness.blockingQuestions.map((q) => (
            <div key={q.id} className="bhq-readiness-question">
              <span className={`bhq-risk-tag bhq-risk-tag--${q.risk}`}>{q.risk}</span>
              <p className="bhq-question-text">{q.plainEnglish}</p>
              {q.suggestedDefault && (
                <p className="bhq-question-default" title={`Recommended: ${q.suggestedDefault}`}>
                  Recommended: {q.suggestedDefault}
                </p>
              )}
              <button
                type="button"
                className="bhq-btn bhq-btn--xs"
                onClick={() => onAnswerQuestion(q)}
                aria-label={`Answer: ${q.plainEnglish}`}
              >
                Answer this question
              </button>
            </div>
          ))}
        </div>
      )}

      {readiness.canUseRecommendedDefaults && (
        <button
          type="button"
          className="bhq-btn bhq-btn--primary bhq-btn--sm"
          disabled={defaultsBusy}
          onClick={onUseDefaults}
          aria-label="Use recommended defaults for all required decisions"
        >
          {defaultsBusy ? "Applying…" : "Use recommended defaults"}
        </button>
      )}

      {!readiness.canUseRecommendedDefaults && readiness.blockingQuestions.length > 0 && (
        <p className="bhq-readiness-tip">
          Answer the questions above in the chat, or type your answers directly.
        </p>
      )}
    </div>
  );
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

  // Readiness
  const [readiness, setReadiness] = useState<ReadinessState | null>(null);
  const [defaultsBusy, setDefaultsBusy] = useState(false);

  // Chat
  const [messages, setMessages] = useState<ChatMsg[]>([]);
  const [chatInput, setChatInput] = useState("");
  const [chatBusy, setChatBusy] = useState(false);
  const msgIdRef = useRef(0);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Upload
  const [uploads, setUploads] = useState<UploadEntry[]>([]);
  const [attachedArtifacts, setAttachedArtifacts] = useState<FileIntakeResponse[]>([]);
  const [dragging, setDragging] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // ── Health checks ──────────────────────────────────────────────────────
  useEffect(() => {
    let active = true;
    getJsonSafe<unknown>("/api/health").then((r) => { if (active) setApiStatus(r.ok ? "ok" : "error"); });
    getJsonSafe<unknown>("/api/ready").then((r) => { if (active) setReadyStatus(r.ok ? "ok" : "error"); });
    return () => { active = false; };
  }, []);

  // ── Project state + readiness polling ─────────────────────────────────
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

      // Poll readiness separately
      try {
        const rd = await getJsonSafe<any>(`/api/projects/${projectId}/readiness`);
        if (active && rd.ok) {
          setReadiness({
            readyToBuild: Boolean(rd.data?.readyToBuild),
            readinessScore: Number(rd.data?.readinessScore ?? 0),
            status: String(rd.data?.status ?? "draft"),
            lockedReason: rd.data?.lockedReason ?? null,
            blockingQuestions: Array.isArray(rd.data?.blockingQuestions) ? rd.data.blockingQuestions : [],
            canUseRecommendedDefaults: Boolean(rd.data?.canUseRecommendedDefaults),
            missingArtifacts: Array.isArray(rd.data?.missingArtifacts) ? rd.data.missingArtifacts : [],
          });
        }
      } catch { /* readiness poll failure is non-fatal */ }
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

  // ── Apply readiness info from a build response ─────────────────────────
  const applyBuildReadiness = useCallback((result: BuildStartResponse) => {
    const raw = result.raw as any;
    const rdy = result.readyToBuild ?? raw?.readyToBuild;
    if (rdy === false) {
      const bq: BlockingQuestion[] = result.blockingQuestions ?? raw?.blockingQuestions ?? [];
      setReadiness({
        readyToBuild: false,
        readinessScore: raw?.readinessScore ?? 0,
        status: result.status ?? raw?.status ?? "clarifying",
        lockedReason: result.lockedReason ?? raw?.lockedReason ?? null,
        blockingQuestions: bq,
        canUseRecommendedDefaults: result.canUseRecommendedDefaults ?? raw?.canUseRecommendedDefaults ?? false,
        missingArtifacts: result.missingArtifacts ?? raw?.missingArtifacts ?? [],
      });
    }
  }, []);

  // ── Use recommended defaults ───────────────────────────────────────────
  const handleUseDefaults = useCallback(async () => {
    if (!projectId || !readiness) return;
    setDefaultsBusy(true);
    try {
      const answers = readiness.blockingQuestions
        .filter((q) => q.suggestedDefault)
        .map((q) => ({ decisionId: q.id, acceptedDefault: true }));
      const result = await postJson<any>(`/api/projects/${projectId}/clarifications`, { answers });
      if (result.readiness) {
        setReadiness({
          readyToBuild: Boolean(result.readiness.readyToBuild),
          readinessScore: Number(result.readiness.readinessScore ?? 0),
          status: String(result.readiness.status ?? "ready_to_build"),
          lockedReason: result.readiness.lockedReason ?? null,
          blockingQuestions: Array.isArray(result.readiness.blockingQuestions) ? result.readiness.blockingQuestions : [],
          canUseRecommendedDefaults: Boolean(result.readiness.canUseRecommendedDefaults),
          missingArtifacts: Array.isArray(result.readiness.missingArtifacts) ? result.readiness.missingArtifacts : [],
        });
      }
      addMsg("system", "Recommended defaults applied. You can now start the build.");
      setLastAction("Defaults applied");
    } catch (err) {
      addMsg("error", err instanceof Error ? err.message : "Failed to apply defaults");
    } finally {
      setDefaultsBusy(false);
    }
  }, [projectId, readiness, addMsg]);

  // ── Answer a question (pre-fill chat input) ────────────────────────────
  const handleAnswerQuestion = useCallback((q: BlockingQuestion) => {
    setChatInput(q.plainEnglish + "\n\nMy answer: ");
    addMsg("system", `Question: ${q.plainEnglish}`);
  }, [addMsg]);

  // ── Trigger build explicitly ───────────────────────────────────────────
  const handleBuild = useCallback(async () => {
    if (!projectId) return;
    setChatBusy(true);
    addMsg("system", "Starting build…");
    try {
      const buildResult = await postJson<BuildStartResponse>(
        `/api/projects/${projectId}/build/start`,
        {
          inputText: "",
          safeDefaults: true,
          artifactIds: attachedArtifacts.map((a) => a.artifactId),
        },
      );
      const buildStatus = buildResult.status || "queued";
      setProjectStatus(buildStatus);
      applyBuildReadiness(buildResult);
      if (buildStatus === "clarifying" || (buildResult.raw as any)?.readyToBuild === false) {
        const lrFromRaw = (buildResult.raw as any)?.lockedReason;
        addMsg("system", lrFromRaw || buildResult.lockedReason || buildResult.message || "Build is locked — answer the required questions first.");
        const bqs: BlockingQuestion[] = buildResult.blockingQuestions ?? (buildResult.raw as any)?.blockingQuestions ?? [];
        for (const bq of bqs) {
          addMsg("system", `Required: ${bq.plainEnglish}`);
        }
      } else {
        const jobInfo = buildResult.jobId ? ` (job: ${buildResult.jobId})` : "";
        addMsg("system", buildResult.message || `Build ${buildStatus}${jobInfo}`);
        if (buildResult.nextStep) setLastAction(buildResult.nextStep);
      }
    } catch (err) {
      addMsg("error", err instanceof Error ? err.message : "Build failed");
    } finally {
      setChatBusy(false);
    }
  }, [projectId, attachedArtifacts, addMsg, applyBuildReadiness]);

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
        const newId = result.projectId;
        setProjectId(newId);
        setProjectStatus("created");
        setLastAction(`Created ${newId}`);
        addMsg("system", `Project created: ${newId}`);
        if (typeof window !== "undefined") {
          window.history.replaceState(null, "", `/projects/${newId}`);
        }
        // Check readiness before auto-triggering build
        addMsg("system", "Analyzing build requirements…");
        try {
          const rd = await getJsonSafe<any>(`/api/projects/${newId}/readiness`);
          if (rd.ok && rd.data) {
            const rdState: ReadinessState = {
              readyToBuild: Boolean(rd.data.readyToBuild),
              readinessScore: Number(rd.data.readinessScore ?? 0),
              status: String(rd.data.status ?? "draft"),
              lockedReason: rd.data.lockedReason ?? null,
              blockingQuestions: Array.isArray(rd.data.blockingQuestions) ? rd.data.blockingQuestions : [],
              canUseRecommendedDefaults: Boolean(rd.data.canUseRecommendedDefaults),
              missingArtifacts: Array.isArray(rd.data.missingArtifacts) ? rd.data.missingArtifacts : [],
            };
            setReadiness(rdState);
            if (!rdState.readyToBuild) {
              const bqs = rdState.blockingQuestions;
              if (rdState.missingArtifacts.length > 0) {
                addMsg("system", "I do not see an uploaded file yet. Upload it now or build from your description.");
              } else if (bqs.length > 0) {
                addMsg("system", rdState.lockedReason || `${bqs.length} required decision${bqs.length !== 1 ? "s" : ""} before building.`);
                for (const bq of bqs.slice(0, 3)) {
                  addMsg("system", `• ${bq.plainEnglish}${bq.suggestedDefault ? ` (recommended: ${bq.suggestedDefault})` : ""}`);
                }
              }
              // Don't trigger build yet — wait for user to resolve
              setChatBusy(false);
              return;
            }
          }
        } catch { /* readiness check failure is non-fatal — fall through to build */ }

        // Ready to build: trigger automatically
        addMsg("system", "Triggering build on Railway…");
        try {
          const buildResult = await postJson<BuildStartResponse>(
            `/api/projects/${newId}/build/start`,
            { inputText: text, safeDefaults: true, artifactIds: attachedArtifacts.map((a) => a.artifactId) },
          );
          const buildStatus = buildResult.status || "queued";
          setProjectStatus(buildStatus);
          applyBuildReadiness(buildResult);
          if (buildStatus === "clarifying" || (buildResult.raw as any)?.readyToBuild === false) {
            const lrFromRaw = (buildResult.raw as any)?.lockedReason;
            addMsg("system", lrFromRaw || buildResult.message || "Botomatic needs more detail. Answer the required questions.");
          } else {
            const jobInfo = buildResult.jobId ? ` (job: ${buildResult.jobId})` : "";
            addMsg("system", buildResult.message || `Build ${buildStatus}${jobInfo}`);
            if (buildResult.nextStep) setLastAction(buildResult.nextStep);
          }
        } catch (buildErr) {
          const msg = buildErr instanceof Error ? buildErr.message : String(buildErr);
          const lower = msg.toLowerCase();
          if (lower.includes("executor unavailable") || lower.includes("worker unavailable")) {
            addMsg("system", `Build queue unavailable on Railway: ${msg}`);
          } else if (lower.includes("provider unavailable") || lower.includes("no build trigger")) {
            addMsg("system", `Build cannot start: ${msg}`);
          } else if (lower.includes("404") || lower.includes("not found")) {
            addMsg("system", "Build trigger endpoint is not available on this Railway deployment — project created, build pending.");
          } else if (lower.includes("502") || lower.includes("503") || lower.includes("unreachable")) {
            addMsg("system", "Railway backend unreachable — project created but build not started.");
          } else {
            addMsg("system", `Build trigger: ${msg}`);
          }
        }
      } else {
        // Existing project: attach artifacts if any, otherwise use operator send
        if (attachedArtifacts.length > 0) {
          addMsg("system", "Triggering build with attached artifacts…");
          try {
            const buildResult = await postJson<BuildStartResponse>(
              `/api/projects/${projectId}/build/start`,
              { inputText: text, safeDefaults: true, artifactIds: attachedArtifacts.map((a) => a.artifactId) },
            );
            const buildStatus = buildResult.status || "queued";
            setProjectStatus(buildStatus);
            applyBuildReadiness(buildResult);
            const jobInfo = buildResult.jobId ? ` (job: ${buildResult.jobId})` : "";
            addMsg("system", buildResult.message || `Build ${buildStatus}${jobInfo}`);
            if (buildResult.nextStep) setLastAction(buildResult.nextStep);
          } catch (buildErr) {
            addMsg("error", buildErr instanceof Error ? buildErr.message : "Build trigger failed");
          }
        } else {
          try {
            const result = await sendOperatorMessage(projectId, text);
            const reply = result.operatorMessage || result.nextAction || result.status || "Command accepted.";
            addMsg("system", reply);
            // If the operator response indicates clarifying state, surface blocking questions
            if (result.status === "clarifying" || result.readyToBuild === false) {
              const bqs: BlockingQuestion[] = result.blockingQuestions ?? [];
              if (bqs.length > 0) {
                for (const bq of bqs.slice(0, 3)) {
                  addMsg("system", `• ${bq.plainEnglish}${bq.suggestedDefault ? ` (recommended: ${bq.suggestedDefault})` : ""}`);
                }
              }
            }
            setLastAction(result.nextAction || "Command sent");
          } catch (err) {
            const msg = err instanceof Error ? err.message : String(err);
            if (msg.includes("404")) {
              addMsg("system", "Follow-up command endpoint is not wired yet — command noted locally.");
            } else {
              addMsg("error", msg);
            }
          }
        }
      }
    } catch (err) {
      addMsg("error", err instanceof Error ? err.message : "Request failed");
    } finally {
      setChatBusy(false);
    }
  }, [chatInput, chatBusy, projectId, attachedArtifacts, addMsg, applyBuildReadiness]);

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
        setAttachedArtifacts((prev) => [...prev, result]);
        setLastAction(`Attached ${uploads[i].file.name} (${result.artifactId})`);
      } catch (err) {
        const msg = err instanceof Error ? err.message : "Upload failed";
        setUploads((prev) => prev.map((u, j) => j === i ? { ...u, status: "error", error: msg } : u));
        addMsg("error", `Upload failed for ${uploads[i].file.name}: ${msg}`);
      }
    }
  }, [projectId, uploads, addMsg]);

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
  const safeLatestStep = sanitize(latestStep);
  const activity = (projectState as any)?.activity as Array<{ label?: string; type?: string; timestamp?: string }> | undefined;
  const recentActivity = activity?.slice(-4) ?? [];

  // Build button state
  const buildReady = !!projectId && (readiness?.readyToBuild ?? false);
  const buildLocked = !!projectId && readiness !== null && !readiness.readyToBuild;
  const buildButtonTitle = !projectId
    ? "Create a project first"
    : buildReady
    ? "Start build"
    : readiness?.lockedReason ?? "Checking readiness…";

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
                  buildLocked
                    ? "Answer the required questions above to unlock build…"
                    : projectStatus === "clarifying"
                    ? "Botomatic needs more detail — describe what to build further…"
                    : projectId
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
                aria-label="Build command input"
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
            {attachedArtifacts.length > 0 && (
              <div className="bhq-artifacts" aria-label="Attached artifacts">
                <div className="bhq-card-subhead">Attached to next build</div>
                {attachedArtifacts.map((a) => (
                  <div key={a.artifactId} className="bhq-artifact-row">
                    <span className="bhq-artifact-name" title={a.artifactId}>{a.fileName}</span>
                    <span className="bhq-artifact-id" title={a.artifactId}>
                      {a.artifactId.length > 16 ? `${a.artifactId.slice(0, 16)}…` : a.artifactId}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </section>
        </div>

        {/* Right column: progress + readiness + preview + launch + logs */}
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

          {/* Build readiness (shown once project exists) */}
          {projectId && readiness !== null && (
            <section className="bhq-card bhq-readiness-panel" aria-label="Build readiness">
              <div className="bhq-card-head">
                {readiness.readyToBuild ? "Build ready" : "Build locked"}
              </div>
              <BuildReadinessPanel
                projectId={projectId}
                readiness={readiness}
                onUseDefaults={() => void handleUseDefaults()}
                onAnswerQuestion={handleAnswerQuestion}
                defaultsBusy={defaultsBusy}
              />
            </section>
          )}

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
                {projectStatus === "clarifying" ? (
                  <p className="bhq-preview-clarifying">
                    Botomatic needs more detail. Use the chat to describe what to build further.
                  </p>
                ) : safeLatestStep ? (
                  <p className="bhq-preview-step">{safeLatestStep}</p>
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
              {/* Build button — always visible, locked until readiness passes */}
              <button
                type="button"
                className={`bhq-btn ${buildReady ? "bhq-btn--primary" : ""}`}
                disabled={!projectId || chatBusy || buildLocked}
                title={buildButtonTitle}
                aria-label={buildButtonTitle}
                onClick={() => void handleBuild()}
              >
                {chatBusy ? "Building…" : buildLocked ? `Locked: ${readiness?.lockedReason?.slice(0, 30) ?? "needs decisions"}…` : "Build app"}
              </button>
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
            {buildLocked && projectId && (
              <p className="bhq-launch-note" style={{ color: "var(--danger, #b73737)" }}>
                {readiness?.lockedReason ?? "Answer required questions to unlock build."}
              </p>
            )}
            {!canLaunch && !buildLocked && projectId && (
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
                    <span className="bhq-log-label">{sanitize(entry.label ?? entry.type ?? "event") || "event"}</span>
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
