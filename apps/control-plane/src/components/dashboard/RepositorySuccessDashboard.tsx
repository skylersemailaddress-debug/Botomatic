"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";

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

function compactDate(value?: string | null) {
  if (!value) return "Not run";
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return value;
  return parsed.toLocaleString();
}

export default function RepositorySuccessDashboard({ projectId }: { projectId: string }) {
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  async function load() {
    const res = await fetch("/api/local-repo-dashboard");
    const json = await res.json();
    setData(json);
    setLoading(false);
  }

  useEffect(() => { load(); }, []);

  if (loading || !data) return <div style={{ padding: 40 }}>Loading…</div>;

  const { repository, latestCommit, filesChanged, totals } = data;

  return (
    <div style={{ background: "#0b1220", color: "white", minHeight: "100vh", padding: 32, fontFamily: "Inter, sans-serif" }}>

      <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 24 }}>
        <div style={{ fontSize: 28 }}>⬡</div>
        <div>
          <div style={{ fontWeight: 600 }}>Botomatic</div>
          <div style={{ opacity: 0.6, fontSize: 12 }}>Enterprise Builder Command Center</div>
        </div>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "1.4fr 1fr", gap: 24 }}>

        <div style={{ background: "#0f172a", borderRadius: 16, padding: 24 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
            <div style={{ background: "#16a34a", width: 48, height: 48, borderRadius: 999, display: "flex", alignItems: "center", justifyContent: "center" }}>✓</div>
            <div>
              <div style={{ fontSize: 20, fontWeight: 600 }}>Repository updated successfully</div>
              <div style={{ opacity: 0.7 }}>All changes committed, tested, and validated</div>
            </div>
          </div>

          <div style={{ display: "flex", gap: 20, marginTop: 20 }}>
            <div><div style={{ opacity: 0.6 }}>Branch</div><strong>{repository.branch}</strong></div>
            <div><div style={{ opacity: 0.6 }}>Commit</div><strong>{shortSha(repository.localSha)}</strong></div>
            <div><div style={{ opacity: 0.6 }}>Date</div><strong>{compactDate(latestCommit.date)}</strong></div>
          </div>
        </div>

        <div style={{ background: "#0f172a", borderRadius: 16, padding: 24 }}>
          <div style={{ fontWeight: 600, marginBottom: 12 }}>Files Changed</div>
          {filesChanged.slice(0, 10).map((f: any) => (
            <div key={f.path} style={{ display: "flex", justifyContent: "space-between", fontSize: 13 }}>
              <span>{f.path}</span>
              <span style={{ color: "#22c55e" }}>+{f.additions}</span>
              <span style={{ color: "#ef4444" }}>-{f.deletions}</span>
            </div>
          ))}
        </div>

      </div>

    </div>
  );
}
