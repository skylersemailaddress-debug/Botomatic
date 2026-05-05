"use client";

import { useState } from "react";
import { AppShell } from "@/components/shell/AppShell";
import { useVibeOrchestration } from "@/components/builder/useVibeOrchestration";

function statusBadge(status: string) {
  let color = "var(--text-3)";
  if (status === "complete" || status === "completed") color = "var(--green)";
  else if (status === "failed" || status === "error") color = "var(--red)";
  else if (status === "running" || status === "pending" || status === "active") color = "var(--amber)";
  return (
    <span style={{
      display: "inline-block",
      padding: "2px 8px",
      borderRadius: 20,
      fontSize: 11,
      fontWeight: 600,
      background: `${color}20`,
      color,
      textTransform: "capitalize",
    }}>
      {status}
    </span>
  );
}

function fmtTimestamp(ts?: string): string {
  if (!ts) return new Date().toISOString().replace("T", " ").slice(0, 19);
  try {
    return new Date(ts).toISOString().replace("T", " ").slice(0, 19);
  } catch {
    return ts;
  }
}

export default function LogsPage({ params }: { params: { projectId: string } }) {
  const { projectId } = params;
  const { graph } = useVibeOrchestration(projectId);
  const [refreshKey, setRefreshKey] = useState(0);

  const stages = graph.stages ?? [];

  return (
    <AppShell projectId={projectId}>
      <div className="page-wrap">
        {/* Top bar */}
        <div className="page-topbar">
          <div className="page-topbar-left">
            <div className="page-eyebrow">Logs</div>
            <h1 style={{ fontSize: 22, fontWeight: 700, color: "var(--text-1)", margin: 0 }}>Build Logs</h1>
            <p style={{ color: "var(--text-2)", marginTop: 2 }}>View build runs, activity logs, and stage status.</p>
          </div>
          <div className="page-topbar-actions">
            <button
              type="button"
              className="btn btn--ghost"
              onClick={() => setRefreshKey((k) => k + 1)}
            >
              ↻ Refresh
            </button>
          </div>
        </div>

        <div className="page-body" key={refreshKey}>
          {/* Build Log — terminal style */}
          <div className="panel-card">
            <div className="panel-card-header">
              <span className="panel-card-title">Build Log</span>
            </div>
            <div
              style={{
                background: "#0f0f1a",
                borderRadius: "0 0 12px 12px",
                padding: "16px",
                fontFamily: "'Fira Code', 'Courier New', monospace",
                fontSize: 12,
                lineHeight: 1.7,
                color: "#e2e0f0",
                minHeight: 180,
                overflowX: "auto",
              }}
            >
              {stages.length === 0 ? (
                <span style={{ color: "#6b6880" }}>Waiting for build activity…</span>
              ) : (
                stages.map((stage, i) => {
                  const ts = fmtTimestamp();
                  const statusColor =
                    stage.status === "complete"
                      ? "#22c55e"
                      : stage.status === "failed" || stage.status === "blocked"
                      ? "#ef4444"
                      : stage.status === "running" || stage.status === "queued"
                      ? "#f59e0b"
                      : "#9588b4";
                  return (
                    <div key={stage.id ?? i}>
                      <span style={{ color: "#6b6880" }}>[{ts}]</span>{" "}
                      <span style={{ color: statusColor, fontWeight: 700 }}>[{stage.status.toUpperCase()}]</span>{" "}
                      <span>{stage.label}</span>
                    </div>
                  );
                })
              )}
            </div>
          </div>

          {/* Activity table */}
          <div className="panel-card" style={{ marginTop: 16 }}>
            <div className="panel-card-header">
              <span className="panel-card-title">Activity</span>
            </div>
            <div className="panel-card-body">
              {stages.length === 0 ? (
                <div className="panel-empty">No activity recorded yet.</div>
              ) : (
                <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
                  <thead>
                    <tr style={{ borderBottom: "1px solid var(--brand-border)" }}>
                      <th style={{ textAlign: "left", padding: "8px 0", color: "var(--text-3)", fontWeight: 600 }}>Stage</th>
                      <th style={{ textAlign: "left", padding: "8px 0", color: "var(--text-3)", fontWeight: 600 }}>Status</th>
                      <th style={{ textAlign: "left", padding: "8px 0", color: "var(--text-3)", fontWeight: 600 }}>Duration</th>
                    </tr>
                  </thead>
                  <tbody>
                    {stages.map((stage, i) => (
                      <tr key={stage.id ?? i} style={{ borderBottom: "1px solid var(--brand-border)" }}>
                        <td style={{ padding: "10px 0", color: "var(--text-1)" }}>{stage.label}</td>
                        <td style={{ padding: "10px 0" }}>{statusBadge(stage.status)}</td>
                        <td style={{ padding: "10px 0", color: "var(--text-3)" }}>—</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
          </div>
        </div>
      </div>
    </AppShell>
  );
}
