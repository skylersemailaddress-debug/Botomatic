"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { AppShell } from "@/components/shell/AppShell";
import { useVibeOrchestration } from "@/components/builder/useVibeOrchestration";
import { getJsonSafe } from "@/services/api";

type LogLine = { text: string; level: "info" | "warn" | "error" | "success" };

const FILE_TREE = [
  { name: "app/", type: "dir" },
  { name: "  page.tsx", type: "file" },
  { name: "  layout.tsx", type: "file" },
  { name: "components/", type: "dir" },
  { name: "  Hero.tsx", type: "file" },
  { name: "  Nav.tsx", type: "file" },
  { name: "styles/", type: "dir" },
  { name: "  globals.css", type: "file" },
];

type CenterTab = "log" | "source" | "patches";

export default function AdvancedPage({ params }: { params: { projectId: string } }) {
  const { projectId } = params;
  const { graph } = useVibeOrchestration(projectId);
  const [centerTab, setCenterTab] = useState<CenterTab>("log");
  const [artifacts, setArtifacts] = useState<{ operationId: string; status: string; branchName?: string | null; prUrl?: string | null }[]>([]);

  useEffect(() => {
    getJsonSafe<{ artifacts?: typeof artifacts }>(`/api/projects/${projectId}/ui/artifacts`)
      .then((r) => { if (r.ok && r.data.artifacts) setArtifacts(r.data.artifacts); })
      .catch(() => undefined);
  }, [projectId]);

  const stages = graph.stages ?? [];

  const logLines: LogLine[] = stages.length === 0
    ? [{ text: "Waiting for build activity…", level: "info" }]
    : stages.map((s) => ({
        text: `[${s.status.toUpperCase()}] ${s.label}`,
        level: s.status === "complete" ? "success" : s.status === "failed" || s.status === "blocked" ? "error" : "info",
      }));

  const lineColor = (l: "info" | "warn" | "error" | "success") =>
    l === "success" ? "#22c55e" : l === "error" ? "#ef4444" : l === "warn" ? "#f59e0b" : "#a5b4fc";

  return (
    <AppShell projectId={projectId}>
      <div style={{ display: "flex", flexDirection: "column", height: "100%", background: "#0d0d1a" }}>
        {/* Topbar */}
        <div style={{ display: "flex", alignItems: "center", gap: 12, padding: "10px 16px", borderBottom: "1px solid rgba(255,255,255,.08)", flexShrink: 0 }}>
          <span style={{ fontSize: 11, fontWeight: 700, color: "#7c6fe0", textTransform: "uppercase", letterSpacing: ".08em" }}>Pro Cockpit</span>
          <span style={{ fontSize: 13, fontWeight: 600, color: "#e2e0f0", marginLeft: 4 }}>Project {projectId.slice(0, 8)}…</span>
          <div style={{ marginLeft: "auto", display: "flex", gap: 8 }}>
            <Link href={`/projects/${projectId}`} className="btn btn--ghost" style={{ fontSize: 11, padding: "4px 10px", color: "#9588b4", borderColor: "rgba(255,255,255,.15)" }}>← Vibe Mode</Link>
            <Link href={`/projects/${projectId}/deployment`} className="btn btn--primary" style={{ fontSize: 11, padding: "4px 10px" }}>Deploy →</Link>
          </div>
        </div>

        {/* 3-col body */}
        <div style={{ display: "grid", gridTemplateColumns: "200px 1fr 260px", flex: 1, minHeight: 0, overflow: "hidden" }}>

          {/* LEFT: File tree */}
          <div style={{ borderRight: "1px solid rgba(255,255,255,.08)", overflowY: "auto", padding: "12px 0" }}>
            <div style={{ fontSize: 10, fontWeight: 700, textTransform: "uppercase", letterSpacing: ".08em", color: "#6b6880", padding: "0 12px 8px" }}>Files</div>
            {FILE_TREE.map((f, i) => (
              <div key={i} style={{
                padding: "5px 12px", fontSize: 12, fontFamily: "monospace",
                color: f.type === "dir" ? "#7c6fe0" : "#c4b5fd",
                cursor: f.type === "file" ? "pointer" : "default",
              }}>
                {f.name}
              </div>
            ))}
          </div>

          {/* CENTER: Log / Source / Patches */}
          <div style={{ display: "flex", flexDirection: "column", minHeight: 0, overflow: "hidden" }}>
            <div style={{ display: "flex", borderBottom: "1px solid rgba(255,255,255,.08)", flexShrink: 0 }}>
              {(["log", "source", "patches"] as CenterTab[]).map((t) => (
                <button key={t} type="button" onClick={() => setCenterTab(t)} style={{
                  padding: "8px 16px", fontSize: 12, fontWeight: 600, background: "none", border: "none",
                  color: centerTab === t ? "#c4b5fd" : "#6b6880", cursor: "pointer",
                  borderBottom: centerTab === t ? "2px solid #7c3aed" : "2px solid transparent",
                }}>
                  {t.charAt(0).toUpperCase() + t.slice(1)}
                </button>
              ))}
            </div>
            <div style={{ flex: 1, overflowY: "auto", padding: 16, fontFamily: "monospace", fontSize: 12, lineHeight: 1.7 }}>
              {centerTab === "log" && logLines.map((l, i) => (
                <div key={i} style={{ color: lineColor(l.level) }}>{l.text}</div>
              ))}
              {centerTab === "source" && (
                <span style={{ color: "#585b70" }}>{"// Source view — select a file from the tree"}</span>
              )}
              {centerTab === "patches" && (
                artifacts.length === 0
                  ? <span style={{ color: "#585b70" }}>No patches yet.</span>
                  : artifacts.map((a, i) => (
                      <div key={i} style={{ marginBottom: 8 }}>
                        <span style={{ color: "#7c6fe0" }}>{a.branchName ?? a.operationId}</span>
                        {" — "}
                        <span style={{ color: a.status === "complete" ? "#22c55e" : a.status === "failed" ? "#ef4444" : "#a5b4fc" }}>{a.status}</span>
                        {a.prUrl && <a href={a.prUrl} target="_blank" rel="noopener noreferrer" style={{ marginLeft: 8, color: "#818cf8", fontSize: 11 }}>View PR ↗</a>}
                      </div>
                    ))
              )}
            </div>
          </div>

          {/* RIGHT: Deployment plan */}
          <div style={{ borderLeft: "1px solid rgba(255,255,255,.08)", overflowY: "auto", padding: 16 }}>
            <div style={{ fontSize: 11, fontWeight: 700, textTransform: "uppercase", letterSpacing: ".08em", color: "#6b6880", marginBottom: 12 }}>Build Plan</div>
            {stages.length === 0 ? (
              <p style={{ fontSize: 12, color: "#6b6880" }}>No active build plan.</p>
            ) : (
              <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                {stages.map((s, i) => (
                  <div key={i} style={{ display: "flex", alignItems: "center", gap: 8, padding: "7px 10px", borderRadius: 8, background: "rgba(255,255,255,.04)", border: "1px solid rgba(255,255,255,.06)" }}>
                    <span style={{ fontSize: 12, color: s.status === "complete" ? "#22c55e" : s.status === "running" ? "#7c3aed" : s.status === "failed" ? "#ef4444" : "#6b6880" }}>
                      {s.status === "complete" ? "✓" : s.status === "running" ? "●" : s.status === "failed" ? "✕" : "○"}
                    </span>
                    <span style={{ fontSize: 12, color: "#c4b5fd", flex: 1 }}>{s.label}</span>
                  </div>
                ))}
              </div>
            )}

            <div style={{ marginTop: 20, fontSize: 11, fontWeight: 700, textTransform: "uppercase", letterSpacing: ".08em", color: "#6b6880", marginBottom: 10 }}>Quick Links</div>
            {[
              { label: "← Vibe Mode", href: `/projects/${projectId}` },
              { label: "Deploy", href: `/projects/${projectId}/deployment` },
              { label: "Evidence", href: `/projects/${projectId}/evidence` },
              { label: "Logs", href: `/projects/${projectId}/logs` },
            ].map((l) => (
              <Link key={l.label} href={l.href} style={{ display: "block", padding: "6px 0", fontSize: 12, color: "#7c6fe0", borderBottom: "1px solid rgba(255,255,255,.05)" }}>
                {l.label}
              </Link>
            ))}
          </div>
        </div>
      </div>
    </AppShell>
  );
}
