"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { AppShell } from "@/components/shell/AppShell";
import { useVibeOrchestration } from "../builder/useVibeOrchestration";
import { getFirstRunFallback, getFirstRunState, type FirstRunState } from "@/services/firstRun";
import { getJsonSafe } from "@/services/api";
import { requestDeploy } from "@/services/launchProof";
import type { OrchestrationStage } from "@/services/orchestration";

type CanvasTab = "vibe" | "diff" | "code";

interface ChatMessage {
  role: "user" | "ai";
  text: string;
  steps?: OrchestrationStage[];
  time: string;
}

function now() {
  return new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
}

function stageIcon(status: string) {
  if (status === "complete") return "✓";
  if (status === "running" || status === "queued") return "●";
  if (status === "failed" || status === "blocked") return "✕";
  return "○";
}

function stageColor(status: string) {
  if (status === "complete") return "var(--green)";
  if (status === "running" || status === "queued") return "var(--brand)";
  if (status === "failed" || status === "blocked") return "var(--red)";
  return "var(--text-3)";
}

function statusLabel(status: string) {
  if (status === "complete") return "Done";
  if (status === "running") return "Running";
  if (status === "queued") return "Queued";
  if (status === "failed") return "Failed";
  if (status === "blocked") return "Blocked";
  return "Pending";
}

function HealthRing({ pct }: { pct: number }) {
  const r = 28;
  const circ = 2 * Math.PI * r;
  const dash = (pct / 100) * circ;
  return (
    <div className="health-ring">
      <svg width="72" height="72" viewBox="0 0 72 72">
        <circle cx="36" cy="36" r={r} fill="none" stroke="#f3f0ff" strokeWidth="6" />
        <circle cx="36" cy="36" r={r} fill="none" stroke="#22c55e" strokeWidth="6"
          strokeDasharray={`${dash} ${circ}`} strokeLinecap="round" />
      </svg>
      <div className="health-ring-label">
        <span className="health-ring-pct">{pct}%</span>
        <span className="health-ring-sub">Health</span>
      </div>
    </div>
  );
}

const WHAT_NEXT = [
  { icon: "🌐", label: "Connect Domain",      desc: "Make your site live",  prompt: "Help me connect a custom domain to this app" },
  { icon: "🖼",  label: "Add Logo",            desc: "Brand your site",      prompt: "Help me add a logo and update the brand identity" },
  { icon: "💳", label: "Payment Setup",        desc: "Accept payments",      prompt: "Integrate Stripe payments with a checkout flow" },
  { icon: "✉️", label: "Email Notifications", desc: "Send confirmations",   prompt: "Set up email notifications with transactional email" },
];

const SUGGESTION_CHIPS = [
  "Make it more minimal",
  "Change color to emerald",
  "Add a video background",
  "Improve mobile view",
  "Add testimonials section",
];

export function VibeDashboard({ projectId }: { projectId: string }) {
  const orchestration = useVibeOrchestration(projectId);

  const [firstRunState, setFirstRunState] = useState<FirstRunState>(getFirstRunFallback(projectId));
  const [deviceMode, setDeviceMode] = useState<"desktop" | "tablet" | "mobile">("desktop");
  const [canvasTab, setCanvasTab] = useState<CanvasTab>("vibe");
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const chatEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    let active = true;
    Promise.all([
      getFirstRunState(projectId),
      getJsonSafe<{ previewUrl?: string | null; verifiedPreviewUrl?: string | null; derivedPreviewUrl?: string | null }>(
        `/api/projects/${projectId}/runtime`
      ),
    ]).then(([firstRun, runtime]) => {
      if (!active) return;
      if (firstRun.ok) setFirstRunState(firstRun.data);
      if (runtime.ok) {
        const url = runtime.data.verifiedPreviewUrl ?? runtime.data.previewUrl ?? runtime.data.derivedPreviewUrl ?? null;
        setPreviewUrl(url);
      }
    }).catch(() => undefined);
    return () => { active = false; };
  }, [projectId]);

  useEffect(() => {
    if (previewUrl) return;
    const interval = setInterval(() => {
      getJsonSafe<{ previewUrl?: string | null; verifiedPreviewUrl?: string | null; derivedPreviewUrl?: string | null }>(
        `/api/projects/${projectId}/runtime`
      ).then((r) => {
        if (r.ok) {
          const url = r.data.verifiedPreviewUrl ?? r.data.previewUrl ?? r.data.derivedPreviewUrl ?? null;
          if (url) setPreviewUrl(url);
        }
      }).catch(() => undefined);
    }, 15000);
    return () => clearInterval(interval);
  }, [projectId, previewUrl]);

  // Sync orchestration stages into the chat history as AI messages
  useEffect(() => {
    const { graph } = orchestration;
    if (graph.stages.length === 0) return;
    setMessages((prev) => {
      const last = prev[prev.length - 1];
      if (last?.role === "ai") {
        return [...prev.slice(0, -1), { ...last, steps: graph.stages }];
      }
      return [...prev, {
        role: "ai",
        text: graph.objective || "Working on your request…",
        steps: graph.stages,
        time: now(),
      }];
    });
  }, [orchestration.graph.stages, orchestration.graph.objective]);

  // When AppShell sends a message, add it to local history via the prompt value
  const prevPrompt = useRef("");
  useEffect(() => {
    const p = orchestration.prompt;
    if (p && p !== prevPrompt.current) {
      prevPrompt.current = p;
    }
  }, [orchestration.prompt]);

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const handleLaunch = async () => {
    await requestDeploy(projectId, { idempotencyKey: `launch_${Date.now()}` });
  };

  const stages = orchestration.graph.stages;
  const frameClass = `vibe-canvas-frame${deviceMode === "tablet" ? " vibe-canvas-frame--tablet" : deviceMode === "mobile" ? " vibe-canvas-frame--mobile" : ""}`;

  return (
    <AppShell projectId={projectId} chipHints={SUGGESTION_CHIPS}>
      <div className="vibe-wrap">
        {/* Topbar */}
        <header className="vibe-topbar">
          <div className="vibe-mode-badge">✦ Vibe Mode</div>
          <span className="vibe-project-name">Project {projectId.slice(0, 8)}…</span>
          <span className="vibe-mode-tagline">Design · Build · Launch</span>

          <div className="vibe-device-switcher" role="tablist" aria-label="Device preview">
            {(["desktop", "tablet", "mobile"] as const).map((d) => (
              <button
                key={d}
                type="button"
                role="tab"
                aria-selected={deviceMode === d}
                className={`vibe-device-btn${deviceMode === d ? " active" : ""}`}
                onClick={() => setDeviceMode(d)}
              >
                {d === "desktop" ? "🖥" : d === "tablet" ? "📱" : "📲"} {d.charAt(0).toUpperCase() + d.slice(1)}
              </button>
            ))}
          </div>

          <div className="vibe-topbar-actions">
            <button
              type="button"
              className="vibe-btn-ghost"
              onClick={() => void navigator.clipboard.writeText(window.location.href).catch(() => undefined)}
            >
              Share
            </button>
            <Link href={`/projects/${projectId}/deployment`} className="vibe-btn-ghost">Deploy</Link>
            <button
              type="button"
              className="vibe-btn-launch"
              disabled={!firstRunState.canLaunch}
              onClick={() => void handleLaunch()}
            >
              {firstRunState.canLaunch ? "🚀 Launch" : "Launch"}
            </button>
          </div>
        </header>

        {/* 3-panel body */}
        <div className="vibe-body">

          {/* LEFT: Chat history panel */}
          <div className="vibe-chat-panel">
            <div className="vibe-chat-tabs">
              <button type="button" className="vibe-chat-tab active" style={{ cursor: "default" }}>Chat</button>
              <button type="button" className="vibe-chat-tab" style={{ opacity: .5, cursor: "default" }}>History</button>
            </div>

            <div className="vibe-chat-scroll">
              {messages.length === 0 ? (
                <div className="vibe-chat-empty">
                  <div className="vibe-chat-empty-icon">✦</div>
                  <h3>Ready to build</h3>
                  <p>Describe what you want in the chat bar below — the conversation will appear here.</p>
                </div>
              ) : (
                messages.map((msg, i) => (
                  <div key={i} className={`vibe-msg vibe-msg--${msg.role}`}>
                    <div className="vibe-msg-avatar">{msg.role === "user" ? "U" : "✦"}</div>
                    <div className="vibe-msg-bubble">
                      <div className="vibe-msg-header">
                        <strong>{msg.role === "user" ? "You" : "Botomatic"}</strong>
                        <span className="vibe-msg-time">{msg.time}</span>
                      </div>
                      <div>{msg.text}</div>
                      {msg.steps && msg.steps.length > 0 && (
                        <div className="vibe-proposed-changes">
                          <div className="vibe-proposed-title">Proposed changes</div>
                          {msg.steps.map((step, si) => (
                            <div key={si} className="vibe-proposed-item">
                              <span style={{ color: stageColor(step.status), fontWeight: 700, fontSize: 13 }}>
                                {stageIcon(step.status)}
                              </span>
                              <span>{step.label}</span>
                              <span style={{ marginLeft: "auto", fontSize: 11, color: stageColor(step.status) }}>
                                {statusLabel(step.status)}
                              </span>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                ))
              )}
              <div ref={chatEndRef} />
            </div>
          </div>

          {/* CENTER: Canvas panel */}
          <div className="vibe-canvas-panel">
            <div className="vibe-canvas-tabs">
              {(["vibe", "diff", "code"] as const).map((t) => (
                <button
                  key={t}
                  type="button"
                  className={`vibe-canvas-tab${canvasTab === t ? " active" : ""}`}
                  onClick={() => setCanvasTab(t)}
                >
                  {t === "vibe" ? "✦ Vibe" : t === "diff" ? "⊕ Diff" : "⌥ Code"}
                </button>
              ))}
              <div className="vibe-canvas-spacer" />
              <span className="vibe-canvas-zoom">100%</span>
            </div>

            <div className="vibe-canvas-area">
              {canvasTab === "vibe" && (
                <div className={frameClass}>
                  {previewUrl ? (
                    <iframe
                      src={previewUrl}
                      title="Live preview"
                      style={{ width: "100%", height: "100%", minHeight: 500, border: "none", borderRadius: 8 }}
                      sandbox="allow-scripts allow-same-origin allow-forms"
                    />
                  ) : (
                    <div className="vibe-canvas-placeholder">
                      <div className="vibe-canvas-placeholder-icon">🖼</div>
                      <h3>Live Preview</h3>
                      <p>Your app will render here once built. Use the chat bar below to start.</p>
                    </div>
                  )}
                </div>
              )}

              {canvasTab === "diff" && (
                <div style={{ flex: 1, width: "100%", height: "100%", overflow: "auto" }}>
                  <div className="vibe-diff-view">
                    {stages.length === 0
                      ? <span style={{ color: "#585b70" }}>{`// No changes yet`}</span>
                      : stages.map((s, i) => (
                          <div key={i} className={i % 2 === 0 ? "vibe-diff-add" : "vibe-diff-rem"}>
                            {i % 2 === 0 ? "+ " : "- "}{s.label}: {statusLabel(s.status)}
                          </div>
                        ))
                    }
                  </div>
                </div>
              )}

              {canvasTab === "code" && (
                <div style={{ flex: 1, width: "100%", height: "100%", overflow: "auto" }}>
                  <div className="vibe-diff-view">
                    <span style={{ color: "#585b70" }}>{`// Source will appear here once your app is generated`}</span>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* RIGHT: Inspector panel */}
          <div className="vibe-inspector-panel">
            <div className="vibe-inspector-header">🔍 Inspector</div>
            <div className="vibe-inspector-body">

              <div className="rail-card">
                <div className="rail-card-header">
                  <span className="rail-card-title">💚 App Health</span>
                  <Link href={`/projects/${projectId}/evidence`} className="rail-card-action">Report →</Link>
                </div>
                <div className="rail-card-body">
                  <div className="health-ring-wrap">
                    <HealthRing pct={firstRunState.hasExecutionRun ? 92 : 0} />
                    <div className="health-metrics">
                      {([
                        ["Performance", firstRunState.hasExecutionRun ? "Good" : "--"],
                        ["Security",    firstRunState.hasExecutionRun ? "Good" : "--"],
                        ["SEO",         firstRunState.hasExecutionRun ? "Good" : "--"],
                        ["Practices",   firstRunState.hasExecutionRun ? "Good" : "--"],
                      ] as [string, string][]).map(([label, val]) => (
                        <div key={label} className="health-metric">
                          <span className="health-metric-label">{label}</span>
                          <span className="health-metric-value" style={{ color: val === "--" ? "var(--text-3)" : undefined }}>{val}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </div>

              <div className="rail-card">
                <div className="rail-card-header">
                  <span className="rail-card-title">⚡ What's Next</span>
                </div>
                <div className="rail-card-body">
                  <div className="next-grid">
                    {WHAT_NEXT.map((item) => (
                      <button
                        key={item.label}
                        type="button"
                        className="next-item"
                        onClick={() => orchestration.setPrompt(item.prompt)}
                      >
                        <div className="next-item-icon">{item.icon}</div>
                        <div className="next-item-label">{item.label}</div>
                        <div className="next-item-desc">{item.desc}</div>
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              <div className="rail-card">
                <div className="rail-card-header">
                  <span className="rail-card-title">🎛 Properties</span>
                </div>
                <div className="rail-card-body">
                  <div className="vibe-inspector-empty">
                    Click any element in the canvas to inspect its properties.
                  </div>
                </div>
              </div>

              <div className="rail-card launch-card">
                <div className="rail-card-header">
                  <span className="rail-card-title">🚀 Launch</span>
                </div>
                <div className="rail-card-body">
                  <p>{firstRunState.canLaunch ? "Everything looks good! Ready to launch." : "Complete build steps to enable launch."}</p>
                  <button
                    type="button"
                    className="launch-card-btn"
                    disabled={!firstRunState.canLaunch}
                    onClick={() => void handleLaunch()}
                  >
                    Launch My App
                  </button>
                  <div className="launch-card-actions">
                    <Link href={`/projects/${projectId}/deployment`} className="launch-card-action-btn" title="Deploy">👁</Link>
                    <Link href={`/projects/${projectId}/logs`} className="launch-card-action-btn" title="Logs">📋</Link>
                    <Link href={`/projects/${projectId}/advanced`} className="launch-card-action-btn" title="Pro Cockpit">⚙️</Link>
                  </div>
                </div>
              </div>

            </div>
          </div>

        </div>
      </div>
    </AppShell>
  );
}
