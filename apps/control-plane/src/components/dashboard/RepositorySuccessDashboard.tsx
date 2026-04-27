"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import ConversationPane from "@/components/chat/ConversationPane";
import BuildStatusRail from "@/components/overview/BuildStatusRail";

type Gate = {
  name: string;
  command: string;
  status: "passed" | "failed" | "not_run";
  durationMs?: number;
  summary: string;
  output?: string;
};

type StreamLine = {
  type: string;
  command?: string;
  data?: string;
  ok?: boolean;
  code?: number | null;
  timestamp?: string;
};

function shortSha(value?: string) {
  if (!value || value === "unknown") return "unknown";
  return value.slice(0, 7);
}

function formatDate(value?: string | null) {
  if (!value) return "not run";
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return value;
  return parsed.toLocaleString();
}

function gateClass(status?: string) {
  if (status === "passed") return "state-callout success";
  if (status === "failed") return "state-callout error";
  return "state-callout warning";
}

export default function RepositorySuccessDashboard({ projectId }: { projectId: string }) {
  const [data, setData] = useState<any>(null);
  const [hybrid, setHybrid] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [running, setRunning] = useState(false);
  const [logs, setLogs] = useState<StreamLine[]>([]);
  const [streaming, setStreaming] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function load(runGates = false, autoRun = true) {
    try {
      setLoading(true);
      const dashboardUrl = `/api/local-repo-dashboard${runGates ? "?runGates=1" : autoRun ? "?autoRunOnChange=1" : ""}`;
      const [dashboardRes, hybridRes] = await Promise.all([
        fetch(dashboardUrl, { cache: "no-store" }),
        fetch("/api/hybrid-ci", { cache: "no-store" }),
      ]);
      const dashboardJson = await dashboardRes.json();
      const hybridJson = await hybridRes.json().catch(() => null);
      setData(dashboardJson);
      setHybrid(hybridJson);
      setError(null);
    } catch (err: any) {
      setError(String(err?.message || err));
    } finally {
      setLoading(false);
    }
  }

  function runLiveCiStream() {
    setLogs([]);
    setStreaming(true);
    const es = new EventSource("/api/local-repo-dashboard/stream");
    es.onmessage = (event) => {
      const parsed = JSON.parse(event.data) as StreamLine;
      setLogs((prev) => [...prev.slice(-160), parsed]);
      if (parsed.type === "complete") {
        es.close();
        setStreaming(false);
        void load(false, false);
      }
    };
    es.onerror = () => {
      es.close();
      setStreaming(false);
    };
  }

  useEffect(() => {
    void load(false, true);
    const timer = setInterval(() => void load(false, true), 30000);
    return () => clearInterval(timer);
  }, []);

  const repository = data?.repository || {};
  const latestCommit = data?.latestCommit || {};
  const filesChanged = data?.filesChanged || [];
  const totals = data?.totals || { additions: 0, deletions: 0 };
  const gates: Gate[] = data?.gates || [];
  const gateSummary = data?.gateSummary || {};
  const pullRequests = data?.pullRequests?.items || [];
  const actionRuns = hybrid?.githubActions?.runs || [];
  const deployHooks = hybrid?.deploymentHooks || [];
  const commitHistory = data?.commitHistory || [];

  const overallState = useMemo(() => {
    if (gateSummary.allPassed) return "passed";
    if (gates.some((g) => g.status === "failed")) return "failed";
    return "pending";
  }, [gateSummary.allPassed, gates]);

  if (loading && !data) {
    return (
      <section className="success-dashboard">
        <div className="surface-card panel">Loading live repository, CI, GitHub Actions, and deployment data...</div>
      </section>
    );
  }

  return (
    <section className="success-dashboard" aria-label="Hybrid CI command dashboard">
      <div className="success-dashboard-grid">
        <div className="surface-card panel" style={{ gridColumn: "span 2" }}>
          <div className="section-header">
            <div>
              <div className="section-header-subtitle">Hybrid CI command center</div>
              <h1 className="section-header-title">Repository status</h1>
              <p className="section-header-subtitle">
                Local runner + GitHub Actions + deployment hooks. Auto-runs CI when the synced GitHub commit changes.
              </p>
            </div>
            <div className={gateClass(overallState)} style={{ minWidth: 190, textAlign: "center" }}>
              {overallState === "passed" ? "All gates passed" : overallState === "failed" ? "Failures present" : "Pending validation"}
            </div>
          </div>

          <div className="metric-grid">
            <div className="metric-card metric-card--info"><div className="metric-label">Branch</div><div className="metric-value">{repository.branch || "main"}</div></div>
            <div className="metric-card metric-card--success"><div className="metric-label">Local SHA</div><div className="metric-value">{shortSha(repository.localSha)}</div></div>
            <div className="metric-card metric-card--info"><div className="metric-label">Remote SHA</div><div className="metric-value">{shortSha(repository.remoteSha)}</div></div>
            <div className={repository.upToDate ? "metric-card metric-card--success" : "metric-card metric-card--warning"}><div className="metric-label">GitHub sync</div><div className="metric-value">{repository.upToDate ? "Current" : "Behind"}</div></div>
            <div className="metric-card"><div className="metric-label">Ahead / Behind</div><div className="metric-value">{repository.ahead || 0}/{repository.behind || 0}</div></div>
            <div className={gateSummary.stale ? "metric-card metric-card--warning" : "metric-card metric-card--success"}><div className="metric-label">CI cache</div><div className="metric-value">{gateSummary.stale ? "Stale" : "Fresh"}</div></div>
          </div>
        </div>

        <div className="surface-card panel">
          <div className="section-header">
            <div><h2 className="section-header-title">Latest commit</h2><p className="section-header-subtitle">{latestCommit.message || "No commit loaded"}</p></div>
            <Link className="rail-link" href={repository.url || "#"}>Open repo</Link>
          </div>
          <div className="validator-list">
            {commitHistory.slice(0, 5).map((commit: any) => (
              <div className="validator-row" key={commit.sha}>
                <div><div className="validator-name">{shortSha(commit.sha)} · {commit.message}</div><div className="validator-summary">{commit.author} · {formatDate(commit.date)}</div></div>
                <span className="state-callout success">commit</span>
              </div>
            ))}
          </div>
        </div>

        <div className="surface-card panel">
          <div className="section-header">
            <div><h2 className="section-header-title">Files changed</h2><p className="section-header-subtitle">Real git diff/latest commit stats</p></div>
            <div className="row"><span className="state-callout success">+{totals.additions || 0}</span><span className="state-callout error">-{totals.deletions || 0}</span></div>
          </div>
          <div className="validator-list" style={{ maxHeight: 250, overflow: "auto" }}>
            {filesChanged.length === 0 ? <div className="empty-state">No changed files in the current working tree or latest commit.</div> : filesChanged.slice(0, 30).map((file: any) => (
              <div className="validator-row" key={file.path}>
                <div><div className="validator-name">{file.path}</div><div className="validator-summary">{file.status}</div></div>
                <div className="row"><span className="text-muted">+{file.additions}</span><span className="text-subtle">-{file.deletions}</span></div>
              </div>
            ))}
          </div>
        </div>

        <div className="surface-card panel">
          <div className="section-header">
            <div><h2 className="section-header-title">Local CI gates</h2><p className="section-header-subtitle">Build → universal tests → validate:all</p></div>
            <div className="row">
              <button disabled={running || streaming} onClick={() => { setRunning(true); load(true, false).finally(() => setRunning(false)); }}>{running ? "Running..." : "Run gates"}</button>
              <button disabled={streaming || running} onClick={runLiveCiStream}>{streaming ? "Streaming..." : "Stream CI"}</button>
            </div>
          </div>
          <div className="surface-grid-3">
            {gates.length === 0 ? <div className="empty-state">No gate run cached yet.</div> : gates.map((gate) => (
              <div className={gate.status === "passed" ? "metric-card metric-card--success" : gate.status === "failed" ? "metric-card metric-card--danger" : "metric-card metric-card--warning"} key={gate.name}>
                <div className="metric-label">{gate.name}</div>
                <div className="metric-value">{gate.status}</div>
                <div className="metric-hint">{gate.summary}</div>
              </div>
            ))}
          </div>
        </div>

        <div className="surface-card panel">
          <div className="section-header"><div><h2 className="section-header-title">Streaming CI timeline</h2><p className="section-header-subtitle">Live log stream from local runner</p></div></div>
          <div className="state-callout" style={{ height: 250, overflow: "auto", fontFamily: "monospace", whiteSpace: "pre-wrap", background: "#f8fafc" }}>
            {logs.length === 0 ? "No stream yet. Click Stream CI." : logs.map((line, index) => `[${line.type}] ${line.command || ""} ${line.data || line.code || ""}`).join("\n")}
          </div>
        </div>

        <div className="surface-card panel">
          <div className="section-header"><div><h2 className="section-header-title">GitHub Actions</h2><p className="section-header-subtitle">Remote workflow status</p></div></div>
          <div className="validator-list" style={{ maxHeight: 250, overflow: "auto" }}>
            {actionRuns.length === 0 ? <div className="empty-state">No GitHub Actions runs available or API unavailable.</div> : actionRuns.map((run: any) => (
              <div className="validator-row" key={run.id}>
                <div><div className="validator-name">{run.name || "workflow"} · {run.status}</div><div className="validator-summary">{run.branch} · {shortSha(run.sha)} · {run.conclusion || "pending"}</div></div>
                <Link className="rail-link" href={run.url}>Open</Link>
              </div>
            ))}
          </div>
        </div>

        <div className="surface-card panel">
          <div className="section-header"><div><h2 className="section-header-title">Pull requests</h2><p className="section-header-subtitle">Open PRs from GitHub</p></div></div>
          <div className="validator-list" style={{ maxHeight: 250, overflow: "auto" }}>
            {pullRequests.length === 0 ? <div className="empty-state">No open pull requests.</div> : pullRequests.map((pr: any) => (
              <div className="validator-row" key={pr.number}>
                <div><div className="validator-name">#{pr.number} · {pr.title}</div><div className="validator-summary">{pr.author} · {pr.branch}</div></div>
                <Link className="rail-link" href={pr.url}>Open</Link>
              </div>
            ))}
          </div>
        </div>

        <div className="surface-card panel">
          <div className="section-header"><div><h2 className="section-header-title">Deployment hooks</h2><p className="section-header-subtitle">Deployment remains approval-gated</p></div></div>
          <div className="surface-grid-3">
            {deployHooks.map((hook: any) => (
              <div className={hook.status === "ready" ? "metric-card metric-card--success" : "metric-card metric-card--warning"} key={hook.environment}>
                <div className="metric-label">{hook.environment}</div>
                <div className="metric-value">{hook.status}</div>
                <div className="metric-hint">{hook.reason}</div>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="cockpit-grid" style={{ marginTop: 16, minHeight: 420 }}>
        <div className="cockpit-chat-shell"><ConversationPane projectId={projectId} /></div>
        <BuildStatusRail projectId={projectId} />
      </div>

      {error ? <div className="state-callout error" style={{ marginTop: 12 }}>{error}</div> : null}
    </section>
  );
}
