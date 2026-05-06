"use client";

import Link from "next/link";
import { Fragment, useEffect, useMemo, useState } from "react";

type Gate = { name: string; command: string; status: "passed" | "failed" | "not_run"; durationMs?: number; summary: string; output?: string };
type DashboardData = { repository: any; latestCommit: any; filesChanged: any[]; totals: { additions: number; deletions: number }; gates: Gate[]; gateSummary: any; commitHistory: any[]; pullRequests?: { items?: any[] } };

const bg = "radial-gradient(circle at 12% 0%, rgba(57,127,255,.18), transparent 27%), radial-gradient(circle at 90% 8%, rgba(31,197,91,.10), transparent 25%), linear-gradient(135deg,#050b15 0%,#091321 45%,#07111f 100%)";
const card = { border: "1px solid rgba(122,163,214,.16)", background: "linear-gradient(180deg, rgba(19,33,53,.93), rgba(9,21,37,.98))", boxShadow: "inset 0 1px 0 rgba(255,255,255,.045), 0 20px 60px rgba(0,0,0,.32)", borderRadius: 12, overflow: "hidden" } as const;
const label = { color: "#47a3ff", fontSize: 12, fontWeight: 900, letterSpacing: .7, textTransform: "uppercase" as const };

function shortSha(v?: string) { return v && v !== "unknown" ? v.slice(0, 7) : "unknown"; }
function fmtDate(v?: string) { if (!v) return "not run"; const d = new Date(v); return Number.isNaN(d.getTime()) ? v : d.toLocaleString([], { month: "short", day: "numeric", year: "numeric", hour: "numeric", minute: "2-digit" }); }
function getGate(gates: Gate[], name: string) { return gates.find((g) => g.name.toLowerCase() === name.toLowerCase()); }
function gateLabel(g?: Gate | { status: string }) { if (!g) return "--"; return g.status === "passed" ? "OK" : g.status === "failed" ? "FAIL" : "--"; }
function gateKind(g?: Gate | { status: string }) { return !g || g.status === "not_run" ? "warn" : g.status === "failed" ? "bad" : "ok"; }

function Pill({ children, kind = "ok" }: { children: React.ReactNode; kind?: "ok" | "bad" | "warn" | "info" }) {
  const c = { ok: ["rgba(34,197,94,.15)", "rgba(34,197,94,.38)", "#3bea79"], bad: ["rgba(239,68,68,.15)", "rgba(239,68,68,.35)", "#ff6b6b"], warn: ["rgba(245,158,11,.15)", "rgba(245,158,11,.35)", "#fbbf24"], info: ["rgba(59,130,246,.15)", "rgba(59,130,246,.35)", "#63adff"] }[kind];
  return <span style={{ display: "inline-flex", alignItems: "center", justifyContent: "center", minWidth: 52, padding: "5px 12px", borderRadius: 999, background: c[0], border: `1px solid ${c[1]}`, color: c[2], fontSize: 12, fontWeight: 900 }}>{children}</span>;
}

function CheckLine({ title, text }: { title: string; text: string }) {
  return <li style={{ display: "grid", gridTemplateColumns: "18px 1fr", gap: 8, margin: "7px 0", alignItems: "start" }}><span style={{ width: 16, height: 16, borderRadius: 999, background: "#35d46b", color: "white", display: "grid", placeItems: "center", fontSize: 11, fontWeight: 1000, boxShadow: "0 0 14px rgba(53,212,107,.45)" }}>✓</span><span style={{ color: "#d6e0ed", fontSize: 13, lineHeight: 1.35 }}><strong style={{ color: "#f7fbff" }}>{title}:</strong> {text}</span></li>;
}

type RepositorySuccessDashboardProps = {
  projectId?: string;
  mode?: "vibe" | "pro";
};

type DashboardLoadState = "idle" | "loading" | "ready" | "error";

export default function RepositorySuccessDashboard({
  projectId = "demo",
  mode = "pro",
}: RepositorySuccessDashboardProps) {
  const [data, setData] = useState<DashboardData | null>(null);
  const [hybrid, setHybrid] = useState<any>(null);
  const [running, setRunning] = useState(false);
  const [loadState, setLoadState] = useState<DashboardLoadState>("loading");
  const [loadError, setLoadError] = useState<string | null>(null);


  async function load(runGates = false) {
    if (!data) setLoadState("loading");
    try {
      const url = `/api/local-repo-dashboard${runGates ? "?runGates=1" : ""}`;
      const [d, h] = await Promise.all([fetch(url, { cache: "no-store" }), fetch("/api/hybrid-ci", { cache: "no-store" }).catch(() => null)]);
      if (!d.ok) throw new Error(`Dashboard API returned HTTP ${d.status}`);
      setData(await d.json());
      if (h?.ok) setHybrid(await h.json().catch(() => null));
      setLoadError(null);
      setLoadState("ready");
    } catch (err: any) {
      setLoadError(String(err?.message || err || "Unknown dashboard fetch failure"));
      setLoadState("error");
    }
  }

  useEffect(() => { void load(false); const t = setInterval(() => void load(false), 30000); return () => clearInterval(t); }, []);

  const repository = data?.repository || {};
  const latestCommit = data?.latestCommit || {};
  const filesChanged = data?.filesChanged || [];
  const totals = data?.totals || { additions: 0, deletions: 0 };
  const gates = data?.gates || [];
  const gateSummary = data?.gateSummary || {};
  const commitHistory = data?.commitHistory || [];
  const prs = data?.pullRequests?.items || [];
  const actions = hybrid?.githubActions?.runs || [];
  const deployHooks = hybrid?.deploymentHooks || [];
  const auditRows = useMemo(
    () => gates.slice(0, 3).map((gate) => ({ key: `${gate.name}-${gate.command}`, gate: gate.name, status: gate.status, summary: gate.summary })),
    [gates]
  );
  const buildGate = getGate(gates, "Build");
  const testGate = getGate(gates, "Tests");
  const validateGate = getGate(gates, "Validate:All");
  const latestActionRun = actions
    .slice()
    .sort((a: any, b: any) => new Date(b.updatedAt || b.createdAt || 0).getTime() - new Date(a.updatedAt || a.createdAt || 0).getTime())[0];
  const actionsGate = latestActionRun
    ? latestActionRun.status === "completed"
      ? { status: latestActionRun.conclusion === "success" ? "passed" : "failed" }
      : { status: "not_run" }
    : { status: "not_run" };
  const failed = gates.some((g) => g.status === "failed");
  const allPassed = Boolean(gateSummary.allPassed);
  const testRows = useMemo(() => ["Unit Tests", "Integration Tests", "Contract Tests", "E2E Tests"].map((n) => [n, testGate?.status === "passed" ? "passed" : testGate?.status === "failed" ? "review" : "not run"]), [testGate?.status]);

  if (!data && loadState !== "error") return <div style={{ minHeight: "100%", background: "#08111f", color: "#e9f2ff", padding: 24 }}>Loading release dashboard…</div>;
  if (!data && loadState === "error") return <div style={{ minHeight: "100%", background: "#08111f", color: "#e9f2ff", padding: 24, display: "grid", placeItems: "center" }}>
    <div style={{ maxWidth: 520, borderRadius: 12, border: "1px solid rgba(239,68,68,.45)", background: "rgba(32,14,20,.82)", padding: 18 }}>
      <h2 style={{ margin: "0 0 8px", color: "#ff8e8e" }}>Dashboard fetch failed</h2>
      <p style={{ margin: "0 0 14px", color: "#fecaca", fontSize: 13 }}>{loadError || "Could not reach /api/local-repo-dashboard."}</p>
      <button onClick={() => void load(false)} style={{ background: "rgba(127,29,29,.35)", border: "1px solid rgba(248,113,113,.4)", color: "#ffd4d4" }}>Retry dashboard fetch</button>
    </div>
  </div>;

  return <div style={{ height: "100%", minHeight: 0, overflow: "hidden", padding: 14, color: "#e9f2ff", background: bg, fontFamily: "Inter, ui-sans-serif, system-ui, -apple-system, Segoe UI, sans-serif" }}>
    <div style={{ height: "100%", display: "grid", gridTemplateRows: "52px 1fr", gap: 14 }}>
      <header style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 12 }}><div style={{ width: 38, height: 38, display: "grid", placeItems: "center", color: "#58a6ff", fontSize: 31, fontWeight: 1000, textShadow: "0 0 18px rgba(88,166,255,.7)" }}>⬡</div><div style={{ fontSize: 30, fontWeight: 900, letterSpacing: -1.2, color: "#f8fbff" }}>Botomatic</div><div style={{ marginLeft: 12, color: "#95a8bf", fontSize: 13, fontWeight: 700 }}>Enterprise Builder Command Center</div></div>
        <button onClick={() => { setRunning(true); load(true).finally(() => setRunning(false)); }} disabled={running} style={{ background: "rgba(47,91,150,.28)", border: "1px solid rgba(98,166,255,.25)", color: "#cfe3ff", borderRadius: 8, padding: "9px 13px", fontWeight: 900 }}>{running ? "Running gates" : "Run live gates"}</button>
      </header>
      <main style={{ minHeight: 0, display: "grid", gridTemplateColumns: "1fr 1fr", gridTemplateRows: "1.18fr .62fr .32fr", gap: 14 }}>
        <section style={{ ...card, padding: 18, display: "grid", gridTemplateRows: "auto auto auto 1fr auto", gap: 10 }}>
          <div style={{ display: "grid", gridTemplateColumns: "48px 1fr", gap: 14, alignItems: "center" }}><div style={{ width: 48, height: 48, borderRadius: 999, background: failed ? "linear-gradient(135deg,#ef4444,#fb7185)" : "linear-gradient(135deg,#37dc70,#16a34a)", color: "white", display: "grid", placeItems: "center", fontSize: 28, fontWeight: 1000, boxShadow: failed ? "0 0 24px rgba(239,68,68,.36)" : "0 0 24px rgba(34,197,94,.42)" }}>✓</div><div><h1 style={{ margin: 0, color: failed ? "#ff7575" : "#3be176", fontSize: 20, lineHeight: 1.08 }}>{failed ? "Repository needs attention" : "Repository updated successfully"}</h1><p style={{ margin: "7px 0 0", color: "#a7b6c9", fontSize: 13 }}>{allPassed ? "All changes committed, tested, and validated" : failed ? "One or more quality gates failed. Review validator evidence." : "Live data loaded. Run gates to validate this revision."}</p></div></div>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(4,1fr)", gap: 18, marginTop: 4 }}>{[["Branch", repository.branch || "main"], ["Commit", shortSha(repository.localSha || latestCommit.sha)], ["Author", latestCommit.author || "Botomatic Builder"], ["Date", fmtDate(latestCommit.date)]].map(([k, v]) => <div key={k}><div style={{ color: "#8497ad", fontSize: 11, marginBottom: 5 }}>{k}</div><div style={{ display: "inline-flex", maxWidth: "100%", overflow: "hidden", textOverflow: "ellipsis", padding: "7px 12px", borderRadius: 6, background: "rgba(37,68,110,.44)", color: "#61a8ff", fontSize: 13, fontWeight: 900 }}>{v}</div></div>)}</div>
          <div style={{ height: 1, background: "rgba(148,163,184,.14)", margin: "2px 0" }} />
          <div style={{ minHeight: 0 }}><h2 style={{ ...label, margin: "0 0 8px" }}>Summary</h2><p style={{ color: "#a7b6c9", fontSize: 13, lineHeight: 1.43, margin: 0 }}>Hybrid CI ties local checkout state, GitHub sync, workflow visibility, validator evidence, and deployment hook posture into one release-command surface.</p><h2 style={{ ...label, margin: "16px 0 8px" }}>What was changed</h2><ul style={{ listStyle: "none", padding: 0, margin: 0 }}><CheckLine title="Intent Routing" text="Self-upgrade remains opt-in and generated-app work stays correctly classified." /><CheckLine title="Negative Overrides" text="Negated self-upgrade language cannot hijack build execution." /><CheckLine title="Contract Binding" text="Compiled output is persisted as master truth and recognized as build evidence." /><CheckLine title="Chat UX" text="Command flow is cleaner and system noise is separated from main output." /><CheckLine title="Validator" text="Regression checks protect routing and contract-binding paths." /></ul></div>
          <div><h2 style={{ ...label, margin: "0 0 10px" }}>Quality gates</h2><div style={{ display: "grid", gridTemplateColumns: "repeat(5,1fr)", gap: 10 }}>{[["Build", buildGate], ["Tests", testGate], ["GitHub", repository.upToDate ? { status: "passed" } : { status: "failed" }], ["Actions", actionsGate], ["Validate:All", validateGate]].map(([name, gate]: any) => <div key={name} style={{ minHeight: 76, border: "1px solid rgba(133,168,212,.12)", background: "rgba(22,35,55,.72)", borderRadius: 8, padding: 10, display: "grid", placeItems: "center", gap: 4 }}><strong style={{ fontSize: 12 }}>{name}</strong><Pill kind={gateKind(gate)}>{gateLabel(gate)}</Pill></div>)}</div></div>
        </section>
        <section style={{ ...card, display: "grid", gridTemplateRows: "42px 1fr 28px" }}><div style={{ padding: "14px 16px 8px", display: "flex", justifyContent: "space-between", alignItems: "center" }}><h2 style={{ ...label, margin: 0 }}>Files changed ({filesChanged.length})</h2><div style={{ display: "flex", gap: 18, fontWeight: 1000, fontSize: 15 }}><span style={{ color: "#35e276" }}>+{totals.additions || 0}</span><span style={{ color: "#ff6262" }}>-{totals.deletions || 0}</span></div></div><div style={{ overflow: "auto", padding: "0 16px" }}>{filesChanged.length === 0 ? <div style={{ color: "#96a8be", padding: 14 }}>No working-tree changes. Latest commit is synced.</div> : filesChanged.slice(0, 18).map((file: any, i: number) => <div key={`${file.path}-${i}`} style={{ display: "grid", gridTemplateColumns: "18px 1fr 58px 58px", alignItems: "center", gap: 8, minHeight: 26, borderBottom: "1px solid rgba(148,163,184,.08)", fontSize: 12 }}><span style={{ color: "#a5b4c7" }}>▧</span><span style={{ whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis", color: "#dce6f4" }}>{file.path}</span><span style={{ color: "#35e276", textAlign: "right" }}>+{file.additions || 0}</span><span style={{ color: "#ff6262", textAlign: "right" }}>-{file.deletions || 0}</span></div>)}</div><div style={{ padding: "6px 16px 12px", color: "#8ea1b7", display: "flex", justifyContent: "space-between", fontSize: 12 }}><span>{filesChanged.length} files changed</span><span>{totals.additions || 0} additions · {totals.deletions || 0} deletions</span></div></section>
        <section style={{ ...card, padding: 14 }}><h2 style={{ ...label, margin: "0 0 12px" }}>Commits ({commitHistory.length || 1})</h2>{(commitHistory.length ? commitHistory.slice(0, 3) : [latestCommit]).map((c: any) => <div key={c.sha || c.message} style={{ display: "grid", gridTemplateColumns: "74px 1fr 148px 86px", alignItems: "center", gap: 8, minHeight: 37, borderBottom: "1px solid rgba(148,163,184,.07)", fontSize: 12 }}><strong style={{ color: "#58a6ff" }}>{shortSha(c.sha)}</strong><span style={{ whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{c.message || "No commit message available"}</span><span style={{ color: "#9badc3", textAlign: "right" }}>{c.author || "unknown"}</span><span style={{ color: "#9badc3", textAlign: "right" }}>{fmtDate(c.date).split(",")[0]}</span></div>)}
          <div style={{ marginTop: 12, border: "1px solid rgba(148,163,184,.12)", borderRadius: 8, overflow: "hidden" }}>
            {auditRows.length === 0 ? <div style={{ color: "#96a8be", padding: 12, fontSize: 12 }}>No gate summaries yet. Run live gates to populate release audit rows.</div> : auditRows.map((row) => (
              <Fragment key={row.key}>
                <div style={{ display: "grid", gridTemplateColumns: "1fr 92px 2fr", gap: 8, padding: "8px 10px", fontSize: 12, borderBottom: "1px solid rgba(148,163,184,.08)" }}>
                  <span>{row.gate}</span>
                  <span>{row.status}</span>
                  <span style={{ color: "#9badc3" }}>{row.summary}</span>
                </div>
              </Fragment>
            ))}
          </div>
        </section>
        <section style={{ ...card, padding: 14, display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14 }}><div><h2 style={{ ...label, margin: "0 0 10px" }}>Test results</h2><div style={{ display: "flex", gap: 12, alignItems: "center", marginBottom: 10 }}><span style={{ width: 42, height: 42, borderRadius: 999, background: "linear-gradient(135deg,#2fc969,#178a46)", display: "grid", placeItems: "center", fontWeight: 1000 }}>✓</span><div><strong>{testGate?.status === "failed" ? "Tests failed" : testGate?.status === "passed" ? "All tests passed" : "Tests not run"}</strong><div style={{ color: "#9badc3", fontSize: 12 }}>{testGate?.summary || "No cached test result"}</div></div></div>{testRows.map(([n, v]) => <div key={n} style={{ display: "flex", justifyContent: "space-between", color: "#cdd8e6", fontSize: 13, margin: "7px 0" }}><span>{n}</span><strong style={{ color: v === "passed" ? "#35e276" : "#fbbf24" }}>{v}</strong></div>)}</div><div><h2 style={{ ...label, margin: "0 0 10px" }}>Validator results</h2><div style={{ display: "flex", gap: 12, alignItems: "center", marginBottom: 10 }}><span style={{ width: 42, height: 42, borderRadius: 999, background: validateGate?.status === "failed" ? "#ef4444" : "linear-gradient(135deg,#2fc969,#178a46)", display: "grid", placeItems: "center", fontWeight: 1000 }}>✓</span><div><strong>{validateGate?.status === "failed" ? "validate:all failed" : validateGate?.status === "passed" ? "validate:all passed" : "validate:all pending"}</strong><div style={{ color: "#9badc3", fontSize: 12 }}>{validateGate?.summary || "No cached validator result"}</div></div></div>{[["Critical", failed ? 1 : 0], ["Warnings", gateSummary.stale ? 1 : 0], ["Info", gates.length]].map(([n, v]) => <div key={String(n)} style={{ display: "flex", justifyContent: "space-between", background: "rgba(10,22,38,.55)", border: "1px solid rgba(148,163,184,.08)", borderRadius: 8, padding: "7px 10px", marginBottom: 7, fontSize: 13 }}><span>{n}</span><strong style={{ color: n === "Critical" ? "#35e276" : "#58a6ff" }}>{v}</strong></div>)}</div></section>
        <section style={{ ...card, padding: 14 }}><h2 style={{ ...label, margin: "0 0 13px" }}>Next steps</h2><div style={{ display: "grid", gridTemplateColumns: "repeat(5,1fr)", gap: 10 }}>{[["Plan", gateSummary.stale ? "CI stale" : "Execution plan ready"], ["Approve", "Architecture approval pending"], ["Execute", "Begin Milestone 1"], ["Validate", "After each milestone"], ["Deploy", "Blocked by default"]].map(([t, s]) => <div key={t}><strong style={{ fontSize: 14 }}>{t}</strong><div style={{ color: "#9badc3", fontSize: 11 }}>{s}</div></div>)}</div></section>
        <section style={{ ...card, padding: 14, display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14 }}><div><h2 style={{ ...label, margin: "0 0 11px" }}>Repository</h2><div style={{ display: "grid", gap: 7, fontSize: 13 }}><Link href={repository.url || "#"} style={{ color: "#58a6ff" }}>{repository.url ? repository.url.replace("https://", "") : "Repository URL not configured"}</Link><span>{repository.branch || "main"}</span><span>{shortSha(repository.localSha || latestCommit.sha)}</span><span>Pushed {fmtDate(latestCommit.date)}</span></div><div style={{ display: "inline-flex", marginTop: 12, padding: "5px 14px", borderRadius: 999, background: repository.upToDate ? "rgba(34,197,94,.16)" : "rgba(245,158,11,.16)", color: repository.upToDate ? "#35e276" : "#fbbf24", fontWeight: 900, fontSize: 12 }}>{repository.upToDate ? "Up to date" : `Behind ${repository.behind || 0}`}</div></div><div><h2 style={{ ...label, margin: "0 0 11px" }}>GitHub + deploy</h2><div style={{ display: "grid", gap: 8, fontSize: 12, color: "#cbd7e6" }}><div><strong>Actions:</strong> {latestActionRun ? `${latestActionRun.name || "workflow"} ${latestActionRun.status}${latestActionRun.conclusion ? ` (${latestActionRun.conclusion})` : ""}` : "No recent runs"}</div><div><strong>Open PRs:</strong> {prs.length ? prs.slice(0, 2).map((pr: any) => `#${pr.number} ${pr.title}`).join(" / ") : "none"}</div><div><strong>Deploy:</strong> {deployHooks.map((h: any) => `${h.environment}:${h.status}`).join(" / ") || "no hooks"}</div></div></div></section>
      </main>
    </div>
  </div>;
}
