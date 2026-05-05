"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { AppShell } from "@/components/shell/AppShell";
import { useVibeOrchestration } from "../builder/useVibeOrchestration";
import { useLiveUIBuilderVibe } from "./useLiveUIBuilderVibe";
import { getFirstRunFallback, getFirstRunState, type FirstRunState } from "@/services/firstRun";
import { getProjectRuntimeState } from "@/services/runtimeStatus";
import { requestDeploy } from "@/services/launchProof";
import type { OrchestrationStage } from "@/services/orchestration";

const SUGGESTION_CHIPS = [
  "Build my app now",
  "Add a new feature",
  "Improve the design",
  "Add a pricing page",
  "Connect payments",
];

const ACTION_CHIPS = [
  { label: "Improve Design", icon: "✨" },
  { label: "Add Page", icon: "+" },
  { label: "Add Feature", icon: "⚡" },
  { label: "Connect Payments", icon: "💳" },
  { label: "Run Tests", icon: "✓" },
  { label: "Launch App", icon: "🚀" },
];

const WHAT_NEXT = [
  { icon: "🌐", label: "Connect Domain", desc: "Make your site live" },
  { icon: "🖼", label: "Add Logo", desc: "Brand your site" },
  { icon: "💳", label: "Payment Setup", desc: "Accept payments" },
  { icon: "✉️", label: "Email Notifications", desc: "Send confirmations" },
];

function stageStatusClass(status: string) {
  if (status === "complete") return "pipeline-step--complete";
  if (status === "running" || status === "queued") return "pipeline-step--running";
  if (status === "failed" || status === "blocked") return "pipeline-step--failed";
  return "pipeline-step--pending";
}

function stageIcon(status: string) {
  if (status === "complete") return "✓";
  if (status === "running" || status === "queued") return "●";
  if (status === "failed" || status === "blocked") return "✕";
  return "○";
}

function checkDotClass(status: string) {
  if (status === "complete") return "build-check-dot--complete";
  if (status === "running" || status === "queued") return "build-check-dot--running";
  if (status === "failed" || status === "blocked") return "build-check-dot--failed";
  return "build-check-dot--pending";
}

function checkStatusClass(status: string) {
  if (status === "complete") return "build-check-status--complete";
  if (status === "running" || status === "queued") return "build-check-status--running";
  if (status === "failed") return "build-check-status--failed";
  return "build-check-status--pending";
}

function checkStatusLabel(status: string) {
  if (status === "complete") return "Complete";
  if (status === "running") return "In Progress";
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

function BuildProgress({ stages }: { stages: OrchestrationStage[] }) {
  if (stages.length === 0) return null;
  const total = stages.length;
  const done = stages.filter((s) => s.status === "complete").length;
  const running = stages.filter((s) => s.status === "running" || s.status === "queued").length;
  const failed = stages.filter((s) => s.status === "failed" || s.status === "blocked").length;
  const pct = Math.round((done / total) * 100);
  const isActive = running > 0;

  return (
    <div className="build-progress">
      <div className="build-progress-header">
        <span className="build-progress-label">
          {isActive && <span className="build-progress-pulse" />}
          {isActive ? "Building…" : done === total ? "Build complete" : failed > 0 ? "Build stalled" : "Build queued"}
        </span>
        <span className="build-progress-count">{done}/{total} steps</span>
      </div>
      <div className="build-progress-track">
        <div
          className={`build-progress-fill${isActive ? " build-progress-fill--active" : done === total ? " build-progress-fill--done" : failed > 0 ? " build-progress-fill--failed" : ""}`}
          style={{ width: `${pct}%` }}
        />
      </div>
      <div className="build-progress-pct">{pct}%</div>
    </div>
  );
}

interface ChatMessage {
  role: "user" | "ai";
  text: string;
  steps?: OrchestrationStage[];
}

export function VibeDashboard({ projectId }: { projectId: string }) {
  const orchestration = useVibeOrchestration(projectId);
  const { addPage } = useLiveUIBuilderVibe();

  const [firstRunState, setFirstRunState] = useState<FirstRunState>(getFirstRunFallback(projectId));
  const [deviceMode, setDeviceMode] = useState<"desktop" | "tablet" | "mobile">("desktop");
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [inputRows, setInputRows] = useState(1);
  const chatEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    let active = true;
    Promise.all([
      getProjectRuntimeState(projectId),
      getFirstRunState(projectId),
    ]).then(([, firstRun]) => {
      if (!active) return;
      if (firstRun.ok) setFirstRunState(firstRun.data);
    }).catch(() => undefined);
    return () => { active = false; };
  }, [projectId]);

  // Sync orchestration stages into chat messages
  useEffect(() => {
    const { graph, submitting } = orchestration;
    if (graph.stages.length === 0) return;
    setMessages((prev) => {
      const last = prev[prev.length - 1];
      if (last?.role === "ai") {
        return [...prev.slice(0, -1), { ...last, steps: graph.stages }];
      }
      return [...prev, { role: "ai", text: graph.objective || "Working on your request…", steps: graph.stages }];
    });
  }, [orchestration.graph.stages, orchestration.graph.objective]);

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const handleSubmit = useCallback(async (e: React.FormEvent) => {
    e.preventDefault();
    const text = orchestration.prompt.trim();
    if (!text || orchestration.submitting) return;
    setMessages((prev) => [...prev, { role: "user", text }]);
    await orchestration.submitPrompt();
  }, [orchestration]);

  const handleChip = useCallback((chip: string) => {
    orchestration.setPrompt(chip);
  }, [orchestration]);

  const handleActionChip = useCallback((label: string) => {
    if (label === "Add Page") { addPage("New Page"); return; }
    if (label === "Launch App") { void requestDeploy(projectId, { idempotencyKey: `launch_${Date.now()}` }); return; }
    const map: Record<string, string> = {
      "Improve Design": "Improve the visual design",
      "Add Feature": "Add a new feature",
      "Connect Payments": "Connect payments with Stripe",
      "Run Tests": "Run the test suite",
    };
    orchestration.setPrompt(map[label] ?? label);
  }, [addPage, orchestration, projectId]);

  const handleLaunch = useCallback(async () => {
    await requestDeploy(projectId, { idempotencyKey: `launch_${Date.now()}` });
  }, [projectId]);

  const handleShare = useCallback(() => {
    void navigator.clipboard.writeText(window.location.href).catch(() => undefined);
  }, []);

  const stages = orchestration.graph.stages;
  const completedCount = stages.filter((s) => s.status === "complete").length;
  const healthPct = stages.length > 0
    ? Math.round((completedCount / stages.length) * 100)
    : firstRunState.hasExecutionRun ? 92 : 0;
  const isBuilding = stages.some((s) => s.status === "running" || s.status === "queued");

  const pipelineSteps = stages.length > 0
    ? stages.slice(0, 5)
    : [
        { label: "Design",   status: "pending" },
        { label: "Features", status: "pending" },
        { label: "Data",     status: "pending" },
        { label: "Testing",  status: "pending" },
        { label: "Launch",   status: "pending" },
      ];

  return (
    <AppShell projectId={projectId}>
      <div className="vibe-wrap">
        {/* ── Top bar ── */}
        <header className="vibe-topbar">
          <div className="vibe-mode-badge">✦ Vibe Mode</div>
          <span className="vibe-mode-tagline">Chat. Design. Build. Launch. All in one flow.</span>

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
                {d.charAt(0).toUpperCase() + d.slice(1)}
              </button>
            ))}
          </div>

          <div className="vibe-topbar-actions">
            <button type="button" className="vibe-btn-ghost" onClick={handleShare}>Share</button>
            <button
              type="button"
              className="vibe-btn-launch"
              disabled={!firstRunState.canLaunch}
              onClick={() => void handleLaunch()}
            >
              {firstRunState.canLaunch ? "🚀 Launch App" : "Launch App"}
            </button>
          </div>
        </header>

        {/* ── Body: chat + right rail ── */}
        <div className="vibe-body">
          {/* Chat panel */}
          <div className="vibe-chat-panel">
            <div className="vibe-chat-scroll">
              {messages.length === 0 ? (
                <div className="vibe-chat-empty">
                  <div className="vibe-chat-empty-icon">✦</div>
                  <h3>What do you want to build?</h3>
                  <p>Describe your idea below and Botomatic will design, build and launch it for you.</p>
                </div>
              ) : (
                messages.map((msg, i) => (
                  <div key={i} className={`vibe-msg vibe-msg--${msg.role}`}>
                    <div className="vibe-msg-avatar">{msg.role === "user" ? "B" : "✦"}</div>
                    <div className="vibe-msg-bubble">
                      <div>{msg.text}</div>
                      {msg.steps && msg.steps.length > 0 && (
                        <div className="vibe-steps">
                          {msg.steps.map((step, si) => (
                            <div key={si} className={`vibe-step vibe-step--${step.status}`}>
                              <div className="vibe-step-icon">{stageIcon(step.status)}</div>
                              {step.label}
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                ))
              )}
              {orchestration.submitting && (
                <div className="vibe-msg vibe-msg--ai">
                  <div className="vibe-msg-avatar">✦</div>
                  <div className="vibe-msg-bubble">
                    <div className="vibe-thinking">
                      <span /><span /><span />
                    </div>
                  </div>
                </div>
              )}
              <div ref={chatEndRef} />
            </div>

            {messages.length > 0 && (
              <div className="vibe-chips">
                {SUGGESTION_CHIPS.map((c) => (
                  <button key={c} type="button" className="vibe-chip" onClick={() => handleChip(c)}>{c}</button>
                ))}
              </div>
            )}

            <form className="vibe-input-bar" onSubmit={(e) => void handleSubmit(e)}>
              <textarea
                className="vibe-input"
                placeholder="Ask anything… (e.g., add a pricing section, make the hero bolder, add dark mode)"
                value={orchestration.prompt}
                rows={inputRows}
                onChange={(e) => {
                  orchestration.setPrompt(e.target.value);
                  const lines = e.target.value.split("\n").length;
                  setInputRows(Math.min(lines, 4));
                }}
                onKeyDown={(e) => {
                  if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); void handleSubmit(e as any); }
                }}
                disabled={orchestration.submitting}
              />
              <button
                type="submit"
                className="vibe-send-btn"
                disabled={!orchestration.prompt.trim() || orchestration.submitting}
                aria-label="Send"
              >
                {orchestration.submitting ? "…" : "▶"}
              </button>
            </form>

            <div className="vibe-chips" style={{ borderTop: "none", paddingTop: 0 }}>
              {ACTION_CHIPS.map((c) => (
                <button key={c.label} type="button" className="vibe-chip" onClick={() => handleActionChip(c.label)}>
                  {c.icon} {c.label}
                </button>
              ))}
            </div>
          </div>

          {/* Right rail */}
          <div className="vibe-rail">
            {/* Build Map */}
            <div className="rail-card">
              <div className="rail-card-header">
                <span className="rail-card-title">
                  📋 Build Map
                  {isBuilding && <span className="rail-building-badge">● Building</span>}
                </span>
                <a href="#" className="rail-card-action">View Audit →</a>
              </div>
              <div className="rail-card-body">
                <BuildProgress stages={stages} />
                <div className="build-pipeline">
                  {pipelineSteps.map((step, i) => (
                    <div key={i} className={`pipeline-step ${stageStatusClass(step.status)}`}>
                      <div className="pipeline-dot">{stageIcon(step.status)}</div>
                      <span className="pipeline-label">{step.label}</span>
                    </div>
                  ))}
                </div>
                {stages.length > 0 && (
                  <div className="build-checklist">
                    {stages.map((s, i) => (
                      <div key={i} className="build-check">
                        <div className="build-check-left">
                          <span className={`build-check-dot ${checkDotClass(s.status)}`} />
                          {s.label}
                        </div>
                        <span className={`build-check-status ${checkStatusClass(s.status)}`}>
                          {checkStatusLabel(s.status)}
                        </span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>

            {/* App Health */}
            <div className="rail-card">
              <div className="rail-card-header">
                <span className="rail-card-title">💚 App Health</span>
                <a href="#" className="rail-card-action">View full report →</a>
              </div>
              <div className="rail-card-body">
                <div className="health-ring-wrap">
                  <HealthRing pct={healthPct} />
                  <div className="health-metrics">
                    {[
                      ["Performance", firstRunState.hasExecutionRun ? "Good" : "--"],
                      ["Security",    firstRunState.hasExecutionRun ? "Good" : "--"],
                      ["SEO",         firstRunState.hasExecutionRun ? "Good" : "--"],
                      ["Best Practices", firstRunState.hasExecutionRun ? "Good" : "--"],
                    ].map(([label, val]) => (
                      <div key={label} className="health-metric">
                        <span className="health-metric-label">{label}</span>
                        <span className="health-metric-value" style={{ color: val === "--" ? "var(--text-3)" : undefined }}>{val}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>

            {/* What's Next */}
            <div className="rail-card">
              <div className="rail-card-header">
                <span className="rail-card-title">⚡ What's Next</span>
              </div>
              <div className="rail-card-body">
                <div className="next-grid">
                  {WHAT_NEXT.map((item) => (
                    <button key={item.label} type="button" className="next-item">
                      <div className="next-item-icon">{item.icon}</div>
                      <div className="next-item-label">{item.label}</div>
                      <div className="next-item-desc">{item.desc}</div>
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {/* Recent Activity */}
            <div className="rail-card">
              <div className="rail-card-header">
                <span className="rail-card-title">🕐 Recent Activity</span>
                <a href="#" className="rail-card-action">View all →</a>
              </div>
              <div className="rail-card-body">
                {stages.length === 0 ? (
                  <p style={{ fontSize: 12, color: "var(--text-3)" }}>No activity yet. Start building to see progress here.</p>
                ) : (
                  <div className="activity-list">
                    {stages.slice().reverse().slice(0, 4).map((s, i) => (
                      <div key={i} className="activity-item">
                        <div className="activity-icon">🔧</div>
                        <span className="activity-text">{s.label}</span>
                        <span className="activity-time">{checkStatusLabel(s.status)}</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>

            {/* One-Click Launch */}
            <div className="rail-card launch-card">
              <div className="rail-card-header">
                <span className="rail-card-title">🚀 One-Click Launch</span>
              </div>
              <div className="rail-card-body">
                <p>{firstRunState.canLaunch ? "Everything looks good! Your app is ready to launch." : "Complete the build steps to enable launch."}</p>
                <button
                  type="button"
                  className="launch-card-btn"
                  disabled={!firstRunState.canLaunch}
                  onClick={() => void handleLaunch()}
                >
                  Launch My App
                </button>
                <div className="launch-card-actions">
                  {["👁", "🧪", "☁️"].map((icon) => (
                    <button key={icon} type="button" className="launch-card-action-btn">{icon}</button>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </AppShell>
  );
}
