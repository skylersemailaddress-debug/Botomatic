"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import ConversationPane from "@/components/chat/ConversationPane";
import BuildStatusRail from "@/components/overview/BuildStatusRail";

export default function RepositorySuccessDashboard({ projectId }: { projectId: string }) {
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [running, setRunning] = useState(false);

  async function load(runGates = false) {
    setLoading(true);
    const res = await fetch(`/api/local-repo-dashboard${runGates ? "?runGates=1" : ""}`);
    const json = await res.json();
    setData(json);
    setLoading(false);
  }

  useEffect(() => {
    load(false);
  }, []);

  if (loading || !data) return <div style={{ padding: 20 }}>Loading live repo data...</div>;

  const { repository, latestCommit, filesChanged, totals, gates, gateSummary } = data;

  return (
    <section className="success-dashboard">
      <div className="success-dashboard-grid">

        <div className="success-card success-card--hero">
          <h1>Repository status (live)</h1>
          <p>{repository.upToDate ? "Up to date with GitHub" : "Out of sync with GitHub"}</p>

          <div><strong>Branch:</strong> {repository.branch}</div>
          <div><strong>Commit:</strong> {latestCommit.sha.slice(0, 7)}</div>
          <div><strong>Message:</strong> {latestCommit.message}</div>
        </div>

        <div className="success-card">
          <h2>Files changed (real)</h2>
          <div>+{totals.additions} / -{totals.deletions}</div>
          {filesChanged.slice(0, 20).map((f: any) => (
            <div key={f.path} style={{ display: "flex", justifyContent: "space-between" }}>
              <span>{f.path}</span>
              <span>+{f.additions} -{f.deletions}</span>
            </div>
          ))}
        </div>

        <div className="success-card">
          <h2>Quality Gates (real)</h2>
          <button onClick={() => { setRunning(true); load(true).then(()=>setRunning(false)); }}>
            {running ? "Running..." : "Run real validators/tests"}
          </button>

          {gates.map((g: any) => (
            <div key={g.name}>
              <strong>{g.name}</strong>: {g.status}
              <div style={{ fontSize: 12 }}>{g.summary}</div>
            </div>
          ))}

          <div>Result: {gateSummary.allPassed ? "ALL PASS" : "FAILURES PRESENT"}</div>
        </div>

      </div>

      <div style={{ display: "grid", gridTemplateColumns: "2fr 1fr", gap: 20, marginTop: 20 }}>
        <ConversationPane projectId={projectId} />
        <BuildStatusRail projectId={projectId} />
      </div>

    </section>
  );
}
