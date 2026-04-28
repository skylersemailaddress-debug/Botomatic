"use client";

import { useEffect, useMemo, useState } from "react";
import {
  buildPartnerEnvelope,
  executeCanonicalCommand,
  fetchRuntimeContext,
} from "@/components/chat/chatCommandExecutor";
import NexusSidebar from "@/components/nexus/NexusSidebar";
import NexusTopbar from "@/components/nexus/NexusTopbar";
import { NexusPanel, StatusPill, StatusDot } from "@/components/nexus/NexusPrimitives";
import { NexusMode } from "@/components/nexus/types";

type DeviceView = "Desktop" | "Tablet" | "Mobile";
type StageStatus = "complete" | "in_progress" | "pending" | "blocked" | "inferred" | "skipped_with_reason";

type Gate = { name: string; status: "passed" | "failed" | "not_run"; summary: string };
type DashboardData = {
  repository: { branch?: string; upToDate?: boolean; behind?: number };
  latestCommit: { author?: string; date?: string; message?: string; sha?: string };
  filesChanged: Array<{ path: string; additions: number; deletions: number }>;
  totals: { additions: number; deletions: number };
  gates: Gate[];
  commitHistory: Array<{ author: string; date: string; message: string; sha: string }>;
};

type ChatEntry = { role: "user" | "assistant"; content: string; at: string };

type RuntimeLaunchState = {
  status: "idle" | "launching" | "running" | "stopped" | "failed";
  process: string;
  port: string;
  url: string;
  health: "unknown" | "healthy" | "degraded";
  logs: string[];
  failureClassification: string;
};

type SharedIntent =
  | "build_project"
  | "edit_ui"
  | "add_feature"
  | "add_page"
  | "connect_integration"
  | "run_tests"
  | "run_validation"
  | "launch_local_app"
  | "stop_local_app"
  | "restart_local_app"
  | "fix_failure"
  | "deploy"
  | "rollback"
  | "explain_status"
  | "show_audit"
  | "switch_mode";

type AuditEntry = {
  timestamp: string;
  actor: string;
  command: string;
  filesChanged: number;
  validatorResult: string;
  proofArtifact: string;
  approvalState: string;
  rollbackPlan: string;
  vibeUnderstood: string;
  vibeAdded: string;
  vibeNext: string;
};

const STAGES = ["Input", "Design", "Features", "Data", "Logic", "Integrations", "Tests", "Launch", "Deploy"];

const SHARED_INTENTS: Record<SharedIntent, string> = {
  build_project: "continue current generated app build",
  edit_ui: "continue current generated app build",
  add_feature: "continue current generated app build",
  add_page: "continue current generated app build",
  connect_integration: "show missing secrets and recommended setup",
  run_tests: "run validate all and summarize proof",
  run_validation: "run validate all and summarize proof",
  launch_local_app: "generate launch capsule from latest generated app artifacts",
  stop_local_app: "pause current generated app build",
  restart_local_app: "continue current generated app build",
  fix_failure: "inspect failed milestone and recommend repair",
  deploy: "prepare deployment readiness, no live deployment",
  rollback: "inspect failed milestone and recommend repair",
  explain_status: "show current system state and next best action",
  show_audit: "show latest proof and launch readiness",
  switch_mode: "show current system state and next best action",
};

const VIBE_CHIPS: Array<{ label: string; intent: SharedIntent }> = [
  { label: "Improve Design", intent: "edit_ui" },
  { label: "Add Page", intent: "add_page" },
  { label: "Add Feature", intent: "add_feature" },
  { label: "Connect Payments", intent: "connect_integration" },
  { label: "Run Tests", intent: "run_tests" },
  { label: "Launch App", intent: "launch_local_app" },
];

const PRO_CHIPS = [
  "run validation",
  "explain errors",
  "patch files",
  "launch app",
  "restart runtime",
  "stop runtime",
  "deploy staging",
  "create PR",
  "rollback",
  "inspect logs",
  "generate migration",
  "connect service",
];

const initialRuntime: RuntimeLaunchState = {
  status: "idle",
  process: "botomatic-local-runtime",
  port: "unknown",
  url: "",
  health: "unknown",
  logs: [],
  failureClassification: "none",
};

function tone(status: string): "ok" | "warn" | "bad" {
  if (status === "passed" || status === "complete" || status === "in_progress") return "ok";
  if (status === "failed" || status === "blocked") return "bad";
  return "warn";
}

function friendlyVibeReply(details: string) {
  if (!details) return "Your app is ready. I’m organizing your project.";
  return `I’m organizing your project. ${details.split("\n")[0]}`;
}

function parseUrl(text: string) {
  return text.match(/https?:\/\/[^\s]+/i)?.[0] || "";
}

function classifyFailure(logText: string) {
  const lower = logText.toLowerCase();
  if (lower.includes("npm err") || lower.includes("install")) return "dependency_install_failure";
  if (lower.includes("test") && lower.includes("fail")) return "test_failure";
  if (lower.includes("eaddrinuse") || lower.includes("port")) return "port_conflict";
  return "unknown_failure";
}

async function fetchDashboardData(): Promise<DashboardData | null> {
  try {
    const res = await fetch("/api/local-repo-dashboard?autoRunOnChange=1", { cache: "no-store" });
    if (!res.ok) return null;
    return await res.json();
  } catch {
    return null;
  }
}

export default function RepositorySuccessDashboard({ projectId, mode = "vibe" }: { projectId: string; mode?: NexusMode }) {
  const [data, setData] = useState<DashboardData | null>(null);
  const [chat, setChat] = useState<ChatEntry[]>([]);
  const [chatInput, setChatInput] = useState("");
  const [busy, setBusy] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [showProNav, setShowProNav] = useState(mode === "pro");
  const [deviceView, setDeviceView] = useState<DeviceView>("Desktop");
  const [runtime, setRuntime] = useState<RuntimeLaunchState>(initialRuntime);
  const [auditEntries, setAuditEntries] = useState<AuditEntry[]>([]);

  useEffect(() => {
    let active = true;
    const load = async () => {
      const next = await fetchDashboardData();
      if (!active) return;
      setLoadError(next ? null : "Live data is temporarily unavailable. Retry shortly.");
      setData(next);
    };
    void load();
    const timer = setInterval(() => void load(), 20000);
    return () => {
      active = false;
      clearInterval(timer);
    };
  }, []);

  const gateMap = useMemo(() => {
    const map = new Map<string, Gate>();
    for (const gate of data?.gates || []) map.set(gate.name.toLowerCase(), gate);
    return map;
  }, [data?.gates]);

  const buildMap = useMemo(() => {
    const build = gateMap.get("build")?.status || "not_run";
    const tests = gateMap.get("tests")?.status || "not_run";
    const validate = gateMap.get("validate:all")?.status || "not_run";
    const hasInput = chat.length > 0 || Boolean(data?.latestCommit?.sha);
    const designTouched = chat.some((item) => item.content.includes("edit_ui") || item.content.includes("Improve Design"));
    const featureTouched = chat.some((item) => item.content.includes("add_feature") || item.content.includes("Add Feature"));
    const dataTouched = chat.some((item) => item.content.includes("connect_integration") || item.content.includes("Connect Payments"));

    const map: Array<{ stage: string; status: StageStatus; detail: string }> = [];
    map.push({ stage: "Input", status: hasInput ? "inferred" : "pending", detail: hasInput ? "Input inferred from your requests and repo context" : "Waiting for input" });
    map.push({ stage: "Design", status: designTouched ? "complete" : "pending", detail: designTouched ? "Design edits captured" : "Pending design instructions" });
    map.push({ stage: "Features", status: featureTouched ? "complete" : "pending", detail: featureTouched ? "Feature work queued" : "No feature request yet" });
    map.push({ stage: "Data", status: dataTouched ? "in_progress" : "pending", detail: dataTouched ? "Integration/data planning in progress" : "No data sources connected" });
    map.push({ stage: "Logic", status: build === "passed" ? "complete" : build === "failed" ? "blocked" : "in_progress", detail: build === "failed" ? "Build failed" : build === "passed" ? "Build passed" : "Checking everything works" });
    map.push({ stage: "Integrations", status: dataTouched ? "in_progress" : "pending", detail: dataTouched ? "Provider setup in progress" : "No integrations requested" });
    map.push({ stage: "Tests", status: tests === "passed" ? "complete" : tests === "failed" ? "blocked" : "pending", detail: tests === "passed" ? "All tests passed" : tests === "failed" ? "Test failures need repair" : "Tests not run" });
    map.push({ stage: "Launch", status: runtime.status === "running" ? "in_progress" : validate === "passed" ? "in_progress" : "pending", detail: runtime.status === "running" ? "Your app is running" : "Launch pending" });
    map.push({ stage: "Deploy", status: "skipped_with_reason", detail: "Approval required" });
    return map;
  }, [chat, data?.latestCommit?.sha, gateMap, runtime.status]);

  const append = (role: "user" | "assistant", content: string) => {
    setChat((prev) => [...prev, { role, content, at: new Date().toLocaleTimeString() }]);
  };

  const pushAudit = (entry: Omit<AuditEntry, "timestamp">) => {
    setAuditEntries((prev) => [{ ...entry, timestamp: new Date().toISOString() }, ...prev].slice(0, 20));
  };

  const mapFreeTextToActions = (input: string): Array<{ intent?: SharedIntent; input?: string }> => {
    const lower = input.toLowerCase().trim();
    if (lower === "launch it" || lower === "run locally") return [{ intent: "launch_local_app" }];
    if (lower === "launch and test") return [{ intent: "launch_local_app" }, { intent: "run_tests" }];
    if (lower === "fix and relaunch") return [{ intent: "fix_failure" }, { intent: "launch_local_app" }];
    return [{ input }];
  };

  const runTestStream = async () => {
    const response = await fetch("/api/local-repo-dashboard/stream", { cache: "no-store" });
    const text = await response.text();
    const lines = text.split("\n").filter((line) => line.startsWith("data: ")).map((line) => line.slice(6));
    const events = lines.map((line) => JSON.parse(line));
    const streamLogs = events
      .filter((e: any) => e.type === "stdout" || e.type === "stderr")
      .map((e: any) => String(e.data || ""))
      .slice(-20);
    const complete = events.find((e: any) => e.type === "complete");
    setRuntime((prev) => ({
      ...prev,
      logs: [...prev.logs, ...streamLogs].slice(-60),
      failureClassification: complete?.ok ? "none" : classifyFailure(streamLogs.join("\n")),
    }));
    return complete?.ok ? "passed" : "failed";
  };

  const runOneAction = async ({ intent, input }: { intent?: SharedIntent; input?: string }) => {
    const resolvedInput = intent ? SHARED_INTENTS[intent] : input?.trim();
    if (!resolvedInput) return;

    let runtimeContext = await fetchRuntimeContext(projectId);
    if ((intent === "deploy" || intent === "rollback") && (runtimeContext.approvalStatus !== "approved" || runtimeContext.launchGateStatus !== "ready")) {
      append("assistant", "Deploy is blocked right now. Do you want me to explain what approval or launch gate is missing?");
      pushAudit({
        actor: "botomatic",
        command: intent,
        filesChanged: data?.filesChanged?.length || 0,
        validatorResult: gateMap.get("validate:all")?.status || "not_run",
        proofArtifact: "unknown",
        approvalState: runtimeContext.approvalStatus,
        rollbackPlan: "Deployment blocked before execution",
        vibeUnderstood: "You asked for a high-risk deployment action.",
        vibeAdded: "I blocked deployment to keep things safe.",
        vibeNext: "Approve missing gates before deploy.",
      });
      return;
    }

    if ((intent === "run_tests" || intent === "launch_local_app") && !runtimeContext.uploadedSpecExists) {
      await executeCanonicalCommand({ projectId, input: SHARED_INTENTS.build_project, runtimeContext });
      append("assistant", "I’m organizing your project first so this can run safely.");
      runtimeContext = await fetchRuntimeContext(projectId);
    }

    const execution = await executeCanonicalCommand({ projectId, input: resolvedInput, runtimeContext });
    const refreshed = await fetchRuntimeContext(projectId);

    if (intent === "launch_local_app") {
      const url = parseUrl(execution.details) || "http://localhost:3000";
      setRuntime((prev) => ({ ...prev, status: "running", health: "healthy", url, port: url.split(":").pop() || "3000", logs: [...prev.logs, execution.details].slice(-60) }));
      append("assistant", mode === "vibe" ? "Your app is running" : buildPartnerEnvelope(refreshed, execution.commandRun, execution.details));
    } else {
      if (intent === "stop_local_app") setRuntime((prev) => ({ ...prev, status: "stopped", health: "unknown", logs: [...prev.logs, execution.details].slice(-60) }));
      if (intent === "restart_local_app") setRuntime((prev) => ({ ...prev, status: "running", health: "healthy", logs: [...prev.logs, execution.details].slice(-60) }));
      if (intent === "run_tests" || intent === "run_validation") await runTestStream();
      append("assistant", mode === "vibe" ? friendlyVibeReply(execution.details) : buildPartnerEnvelope(refreshed, execution.commandRun, execution.details));
    }

    pushAudit({
      actor: "botomatic",
      command: intent || resolvedInput,
      filesChanged: data?.filesChanged?.length || 0,
      validatorResult: gateMap.get("validate:all")?.status || "not_run",
      proofArtifact: "runtime/dashboard-live-cache.json",
      approvalState: refreshed.approvalStatus,
      rollbackPlan: refreshed.failureInspection?.rollbackPlan || "Revert files touched in this attempt.",
      vibeUnderstood: `I understood you wanted: ${intent || resolvedInput}.`,
      vibeAdded: execution.details.split("\n")[0] || "I executed your request.",
      vibeNext: refreshed.launchGateStatus === "ready" ? "You can launch or deploy with approval." : "I can continue with the next safe step.",
    });
  };

  const dispatchAction = async ({ intent, input }: { intent?: SharedIntent; input?: string }) => {
    const source = intent ? `${intent}: ${SHARED_INTENTS[intent]}` : (input || "").trim();
    if (!source || busy) return;
    setBusy(true);
    append("user", source);
    try {
      const actions = intent ? [{ intent }] : mapFreeTextToActions(input || "");
      for (const action of actions) await runOneAction(action);
      setChatInput("");
    } catch (error: any) {
      const message = `Action blocked or unavailable: ${error?.message || "unknown error"}`;
      append("assistant", message);
      setRuntime((prev) => ({ ...prev, status: "failed", health: "degraded", failureClassification: classifyFailure(message) }));
    } finally {
      setBusy(false);
    }
  };

  const latestAudit = auditEntries[0];

  return (
    <div className="nexus-shell">
      <NexusSidebar
        mode={mode}
        showProNav={showProNav}
        onShowPro={() => dispatchAction({ intent: "switch_mode" }).then(() => setShowProNav(true))}
        projectId={projectId}
        onPrimaryAction={() => dispatchAction({ intent: "build_project" })}
      />

      <section className="nexus-main">
        <NexusTopbar
          mode={mode}
          projectId={projectId}
          branch={data?.repository?.branch || "main"}
          environment={mode === "vibe" ? "Workspace" : "Development"}
          deviceView={deviceView}
          onSetDeviceView={setDeviceView}
          onRunAll={() => dispatchAction({ intent: "run_validation" })}
          onLaunch={() => dispatchAction({ intent: "launch_local_app" })}
          onDeploy={() => dispatchAction({ intent: "deploy" })}
        />

        {loadError && <div className="nexus-state nexus-state--error">{loadError}</div>}
        {!data && !loadError && <div className="nexus-state nexus-state--loading">Loading workspace status…</div>}

        <div className={`nexus-grid nexus-grid--${mode}`}>
          <NexusPanel title={mode === "vibe" ? "Central Workspace" : "AI Copilot"} className="nexus-chat">
            <div className="nexus-chat-log">
              {chat.length === 0 && (
                <div className="nexus-state nexus-state--empty">
                  {mode === "vibe" ? "Your app is ready. Tell me what to build or improve." : "Run validation, explain errors, patch files, or inspect runtime state."}
                </div>
              )}
              {chat.map((entry, idx) => (
                <article className={`nexus-msg nexus-msg--${entry.role}`} key={`${entry.at}-${idx}`}>
                  <strong>{entry.role === "user" ? "You" : "Botomatic"}</strong>
                  <p>{entry.content}</p>
                </article>
              ))}
            </div>
            <div className="nexus-chip-row">
              {mode === "vibe"
                ? VIBE_CHIPS.map((chip) => <button key={chip.label} onClick={() => dispatchAction({ intent: chip.intent })}>{chip.label}</button>)
                : PRO_CHIPS.map((chip) => <button key={chip} onClick={() => dispatchAction({ input: chip })}>{chip}</button>)}
            </div>
          </NexusPanel>

          <NexusPanel title={mode === "vibe" ? "Live Design Canvas" : "Live Application"} className="nexus-canvas">
            <div className="nexus-row">
              {mode === "vibe" ? <button onClick={() => dispatchAction({ intent: "edit_ui" })}>Edit</button> : <><button>Desktop</button><button>Tablet</button><button>Mobile</button></>}
            </div>
            <button className="nexus-preview" onClick={() => mode === "vibe" && dispatchAction({ intent: "edit_ui" })}>
              {mode === "vibe" ? `Click any part to visually edit (${deviceView} preview).` : `Process: ${runtime.process} · Port: ${runtime.port}`}
            </button>
            {mode === "pro" && (
              <div className="nexus-row">
                <button onClick={() => dispatchAction({ intent: "restart_local_app" })}>Restart</button>
                <button onClick={() => dispatchAction({ intent: "stop_local_app" })}>Stop</button>
                <button onClick={() => dispatchAction({ input: "inspect logs" })}>View Logs</button>
              </div>
            )}
          </NexusPanel>

          <NexusPanel title={mode === "vibe" ? "Build Map" : "Build Pipeline"} className="nexus-status">
            <ul>
              {buildMap.map((item) => (
                <li key={item.stage}>
                  <span><StatusDot tone={tone(item.status)} />{item.stage}<small>{item.detail}</small></span>
                  <StatusPill tone={tone(item.status)} value={item.status.replaceAll("_", " ")} />
                </li>
              ))}
            </ul>
          </NexusPanel>

          <NexusPanel title={mode === "vibe" ? "App Health" : "System Health"} className="nexus-health">
            <p>Build: {gateMap.get("build")?.status || "pending"}</p>
            <p>Tests: {gateMap.get("tests")?.status || "pending"}</p>
            <p>Validate: {gateMap.get("validate:all")?.status || "pending"}</p>
            <p>Deploy: blocked</p>
          </NexusPanel>

          {mode === "vibe" && (
            <>
              <NexusPanel title="Live Preview">
                <p>{runtime.status === "running" ? "Your app is running" : "Latest local preview is shown after each approved build step."}</p>
                {runtime.url && <a href={runtime.url} target="_blank" rel="noreferrer">Open App</a>}
              </NexusPanel>
              <NexusPanel title="What’s Next"><p>Connect domain, add logo, configure notifications.</p></NexusPanel>
              <NexusPanel title="Recent Activity"><p>{data?.latestCommit?.message || "Waiting for first tracked activity."}</p></NexusPanel>
              <NexusPanel title="One-Click Launch" className="nexus-launch">
                <p>Putting your app live stays approval-gated.</p>
                <div className="nexus-row">
                  <button className="nexus-primary" onClick={() => dispatchAction({ intent: "launch_local_app" })}>Open App</button>
                  <button onClick={() => dispatchAction({ intent: "run_tests" })}>Test</button>
                  <button onClick={() => dispatchAction({ intent: "deploy" })}>Deploy</button>
                </div>
              </NexusPanel>
              <NexusPanel title="Audit">
                <p><strong>What I understood:</strong> {latestAudit?.vibeUnderstood || "Waiting for your first command."}</p>
                <p><strong>What I added:</strong> {latestAudit?.vibeAdded || "No changes yet."}</p>
                <p><strong>What’s next:</strong> {latestAudit?.vibeNext || "I can keep building when you’re ready."}</p>
              </NexusPanel>
            </>
          )}

          {mode === "pro" && (
            <>
              <NexusPanel title="Code Changes"><p>{data?.filesChanged?.length || 0} files · +{data?.totals?.additions || 0} / -{data?.totals?.deletions || 0}</p><p>{data?.filesChanged?.[0]?.path || "No working tree changes."}</p></NexusPanel>
              <NexusPanel title="Services"><ul className="nexus-list"><li>API: unknown</li><li>Database: unknown</li><li>Storage: unknown</li></ul></NexusPanel>
              <NexusPanel title="Database Schema"><p>unknown (schema endpoint not available in current payload)</p></NexusPanel>
              <NexusPanel title="Test Results"><p>{gateMap.get("tests")?.status === "passed" ? "passed" : gateMap.get("tests")?.status === "failed" ? "failed" : "not run"}</p></NexusPanel>
              <NexusPanel title="Terminal / Logs"><pre className="nexus-log">{runtime.logs.slice(-8).join("\n") || "No logs yet."}</pre></NexusPanel>
              <NexusPanel title="Recent Commits"><p>{data?.commitHistory?.[0]?.message || data?.latestCommit?.message || "No commit data available."}</p><p>Failure classification: {runtime.failureClassification}</p><p>Health: {runtime.health}</p></NexusPanel>
              <NexusPanel title="Audit">
                <div className="nexus-audit-table">
                  <div>timestamp</div><div>actor</div><div>command</div><div>files changed</div><div>validator result</div><div>proof artifact</div><div>approval state</div><div>rollback plan</div>
                  {auditEntries.slice(0, 3).map((entry, idx) => (
                    <>
                      <div key={`ts-${idx}`}>{entry.timestamp}</div>
                      <div key={`ac-${idx}`}>{entry.actor}</div>
                      <div key={`cm-${idx}`}>{entry.command}</div>
                      <div key={`fc-${idx}`}>{entry.filesChanged}</div>
                      <div key={`vr-${idx}`}>{entry.validatorResult}</div>
                      <div key={`pa-${idx}`}>{entry.proofArtifact}</div>
                      <div key={`ap-${idx}`}>{entry.approvalState}</div>
                      <div key={`rp-${idx}`}>{entry.rollbackPlan}</div>
                    </>
                  ))}
                </div>
              </NexusPanel>
            </>
          )}
        </div>

        <footer className="nexus-chatbar">
          <input value={chatInput} onChange={(e) => setChatInput(e.target.value)} placeholder={mode === "vibe" ? "Ask anything..." : "Ask AI Copilot..."} />
          <button className="nexus-primary" disabled={busy} onClick={() => dispatchAction({ input: chatInput })}>{busy ? "Running..." : "Send"}</button>
        </footer>

        {mode === "pro" && (
          <div className="nexus-status-strip">
            <span>Status: {runtime.status}</span>
            <span>Environment: Development</span>
            <span>Process: {runtime.process}</span>
            <span>Port: {runtime.port}</span>
            <div className="nexus-quick-actions">
              <button onClick={() => dispatchAction({ intent: "run_validation" })}>Quick: Validate</button>
              <button onClick={() => dispatchAction({ input: "inspect logs" })}>Quick: Logs</button>
              <button onClick={() => dispatchAction({ intent: "restart_local_app" })}>Quick: Restart</button>
            </div>
          </div>
        )}
      </section>
    </div>
  );
}
