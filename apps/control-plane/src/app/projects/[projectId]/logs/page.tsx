"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { AppShell } from "@/components/shell/AppShell";
import { useVibeOrchestration } from "@/components/builder/useVibeOrchestration";

function checkStatusLabel(status: string) {
  if (status === "complete") return "Complete";
  if (status === "running") return "In Progress";
  if (status === "queued") return "Queued";
  if (status === "failed") return "Failed";
  return "Pending";
}

export default function LogsPage({ params }: { params: { projectId: string } }) {
  const { projectId } = params;
  const orchestration = useVibeOrchestration(projectId);
  const stages = orchestration.graph.stages;

  const logLines = [
    { type: "muted" as const, text: `[system] Build log stream for project ${projectId}` },
    { type: "info" as const, text: "[system] Orchestrator connected. Listening for events…" },
    ...stages.flatMap((s, i) => [
      { type: "muted" as const, text: `[${new Date().toISOString()}] Stage ${i + 1}: ${s.label}` },
      { type: s.status === "complete" ? "success" as const : s.status === "failed" ? "error" as const : "info" as const, text: `  → ${checkStatusLabel(s.status)}` },
    ]),
  ];

  return (
    <AppShell projectId={projectId}>
      <div className="page-wrap">
        <div className="page-topbar">
          <div className="page-topbar-left">
            <div className="page-eyebrow">Logs</div>
            <h2>Build Logs</h2>
            <p>Live build runs, audit events, and deployment history.</p>
          </div>
          <div className="page-topbar-actions">
            <Link href={`/projects/${projectId}`} className="btn btn--ghost">← Vibe Mode</Link>
            <Link href={`/projects/${projectId}/advanced`} className="btn btn--ghost">Pro Cockpit</Link>
          </div>
        </div>

        <div className="page-body">
          {/* Live log terminal */}
          <div style={{ background: "#1e1e2e", borderRadius: 12, overflow: "hidden", border: "1px solid rgba(255,255,255,.06)" }}>
            <div style={{ display: "flex", alignItems: "center", gap: 8, padding: "10px 16px", borderBottom: "1px solid rgba(255,255,255,.06)" }}>
              <div style={{ width: 10, height: 10, borderRadius: "50%", background: "#f38ba8" }} />
              <div style={{ width: 10, height: 10, borderRadius: "50%", background: "#f9e2af" }} />
              <div style={{ width: 10, height: 10, borderRadius: "50%", background: "#a6e3a1" }} />
              <span style={{ fontSize: 11, color: "#585b70", marginLeft: 8 }}>Build Log — {projectId}</span>
            </div>
            <div style={{ padding: 16, fontFamily: "SF Mono, Fira Code, monospace", fontSize: 12, lineHeight: 1.8, minHeight: 300, maxHeight: 500, overflowY: "auto" }}>
              {logLines.map((line, i) => (
                <div key={i} className={`cockpit-log-line cockpit-log-line--${line.type}`}>{line.text}</div>
              ))}
            </div>
          </div>

          {/* Build runs table */}
          <div className="panel-card">
            <div className="panel-card-header">
              <span className="panel-card-title">📋 Build Runs</span>
            </div>
            <div className="panel-card-body">
              {stages.length === 0 ? (
                <p className="panel-empty">No build runs yet. Start building to see history here.</p>
              ) : (
                <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
                  <thead>
                    <tr style={{ borderBottom: "1px solid rgba(91,43,224,.08)" }}>
                      {["Stage", "Status", "Started"].map((h) => (
                        <th key={h} style={{ textAlign: "left", padding: "8px 0", color: "var(--text-3)", fontWeight: 600, fontSize: 11, textTransform: "uppercase", letterSpacing: ".05em" }}>{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {stages.map((s, i) => (
                      <tr key={i} style={{ borderBottom: "1px solid rgba(91,43,224,.04)" }}>
                        <td style={{ padding: "10px 0", color: "var(--text-1)" }}>{s.label}</td>
                        <td style={{ padding: "10px 0" }}>
                          <span className={`status-badge status-badge--${s.status === "complete" ? "green" : s.status === "failed" ? "red" : "blue"}`}>
                            {checkStatusLabel(s.status)}
                          </span>
                        </td>
                        <td style={{ padding: "10px 0", color: "var(--text-3)", fontSize: 12 }}>Just now</td>
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
