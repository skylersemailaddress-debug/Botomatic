"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { AppShell } from "@/components/shell/AppShell";
import { useVibeOrchestration } from "@/components/builder/useVibeOrchestration";

const FILE_TREE = [
  { icon: "📁", name: "src/", depth: 0 },
  { icon: "📁", name: "components/", depth: 1 },
  { icon: "📄", name: "App.tsx", depth: 2 },
  { icon: "📄", name: "Header.tsx", depth: 2 },
  { icon: "📄", name: "Footer.tsx", depth: 2 },
  { icon: "📁", name: "pages/", depth: 1 },
  { icon: "📄", name: "index.tsx", depth: 2 },
  { icon: "📄", name: "dashboard.tsx", depth: 2 },
  { icon: "📁", name: "styles/", depth: 1 },
  { icon: "📄", name: "globals.css", depth: 2 },
  { icon: "📁", name: "public/", depth: 0 },
  { icon: "📄", name: "package.json", depth: 0 },
  { icon: "📄", name: "tsconfig.json", depth: 0 },
];

function checkStatusLabel(status: string) {
  if (status === "complete") return "Complete";
  if (status === "running") return "In Progress";
  if (status === "queued") return "Queued";
  if (status === "failed") return "Failed";
  return "Pending";
}

export default function AdvancedCockpitPage({ params }: { params: { projectId: string } }) {
  const { projectId } = params;
  const orchestration = useVibeOrchestration(projectId);
  const [activeFile, setActiveFile] = useState("App.tsx");
  const [view, setView] = useState<"source" | "logs" | "patches" | "validation">("logs");

  const stages = orchestration.graph.stages;

  const logLines = stages.length > 0
    ? stages.flatMap((s, i) => [
        { type: "muted" as const, text: `[${new Date().toISOString()}] Stage ${i + 1}: ${s.label}` },
        { type: s.status === "complete" ? "success" as const : s.status === "failed" ? "error" as const : "info" as const, text: `  → ${checkStatusLabel(s.status)}` },
      ])
    : [
        { type: "muted" as const, text: "[system] Pro Cockpit ready. Run a build to see live logs." },
        { type: "info" as const, text: "[system] Watching for orchestration events…" },
      ];

  return (
    <AppShell projectId={projectId}>
      <div className="cockpit-wrap">
        {/* Cockpit topbar */}
        <div className="cockpit-topbar">
          <span className="cockpit-badge">PRO</span>
          <span className="cockpit-title">Advanced Cockpit — Project {projectId.slice(0, 8)}…</span>
          <div style={{ display: "flex", gap: 8 }}>
            {(["logs", "source", "patches", "validation"] as const).map((v) => (
              <button
                key={v}
                type="button"
                onClick={() => setView(v)}
                style={{
                  padding: "4px 12px", borderRadius: 5, fontSize: 12, fontWeight: 600,
                  background: view === v ? "rgba(139,92,246,.25)" : "rgba(255,255,255,.06)",
                  color: view === v ? "#cba6f7" : "#585b70",
                  border: "1px solid",
                  borderColor: view === v ? "rgba(139,92,246,.4)" : "rgba(255,255,255,.08)",
                  transition: "all .12s",
                }}
              >
                {v.charAt(0).toUpperCase() + v.slice(1)}
              </button>
            ))}
            <Link href={`/projects/${projectId}`} style={{ marginLeft: 8, padding: "4px 12px", borderRadius: 5, fontSize: 12, fontWeight: 600, background: "rgba(255,255,255,.06)", color: "#bac2de", border: "1px solid rgba(255,255,255,.08)" }}>
              ← Vibe Mode
            </Link>
          </div>
        </div>

        {/* 3-panel body */}
        <div className="cockpit-body">
          {/* Left: file tree */}
          <div className="cockpit-left">
            <div className="cockpit-panel-title">File Tree</div>
            <div className="cockpit-panel-body">
              {FILE_TREE.map((f, i) => (
                <div
                  key={i}
                  className={`cockpit-tree-item${activeFile === f.name ? " active" : ""}`}
                  style={{ paddingLeft: 8 + f.depth * 14 }}
                  onClick={() => { if (!f.name.endsWith("/")) setActiveFile(f.name); }}
                >
                  <span className="cockpit-tree-icon">{f.icon}</span>
                  {f.name}
                </div>
              ))}
            </div>
          </div>

          {/* Center: main view */}
          <div className="cockpit-center">
            {view === "logs" && (
              <div className="cockpit-editor">
                {logLines.map((line, i) => (
                  <div key={i} className={`cockpit-log-line cockpit-log-line--${line.type}`}>
                    {line.text}
                  </div>
                ))}
              </div>
            )}

            {view === "source" && (
              <div className="cockpit-editor">
                <span style={{ color: "#585b70" }}>{`// ${activeFile}`}</span>{"\n"}
                <span style={{ color: "#f38ba8" }}>{"import"}</span>
                <span style={{ color: "#cdd6f4" }}>{" React "}</span>
                <span style={{ color: "#f38ba8" }}>{"from"}</span>
                <span style={{ color: "#a6e3a1" }}>{" 'react';\n\n"}</span>
                <span style={{ color: "#585b70" }}>{`// Source will be populated when your app is generated.`}</span>
              </div>
            )}

            {view === "patches" && (
              <div className="cockpit-editor">
                {stages.length === 0
                  ? <span style={{ color: "#585b70" }}>{`// No patches applied yet.`}</span>
                  : stages.map((s, i) => (
                      <div key={i} className={i % 2 === 0 ? "vibe-diff-add" : "vibe-diff-rem"}>
                        {i % 2 === 0 ? "+ " : "- "}{s.label}
                      </div>
                    ))
                }
              </div>
            )}

            {view === "validation" && (
              <div className="cockpit-editor">
                {stages.length === 0
                  ? <span style={{ color: "#585b70" }}>{`// No validation results yet. Run a build first.`}</span>
                  : stages.map((s, i) => (
                      <div key={i} className={`cockpit-log-line cockpit-log-line--${s.status === "complete" ? "success" : s.status === "failed" ? "error" : "info"}`}>
                        [{s.status.toUpperCase()}] {s.label}
                      </div>
                    ))
                }
              </div>
            )}
          </div>

          {/* Right: deployment plans / metadata */}
          <div className="cockpit-right">
            <div className="cockpit-panel-title">Deployment Plan</div>
            <div className="cockpit-panel-body">
              {[
                { label: "Provider", value: "Railway" },
                { label: "Runtime", value: "Node 20 LTS" },
                { label: "Build cmd", value: "npm run build" },
                { label: "Start cmd", value: "npm start" },
                { label: "Port", value: "3000" },
                { label: "Region", value: "us-west-2" },
                { label: "Mode", value: "DRY RUN" },
              ].map(({ label, value }) => (
                <div key={label} className="vibe-inspector-row">
                  <span className="vibe-inspector-label">{label}</span>
                  <span className="vibe-inspector-value" style={{ fontFamily: "monospace", fontSize: 11 }}>{value}</span>
                </div>
              ))}

              <div style={{ margin: "16px 0 8px", padding: "0 14px" }}>
                <p style={{ fontSize: 11, color: "#585b70", marginBottom: 8 }}>
                  Dry-run boundary active. Switch to Live to deploy.
                </p>
                <Link
                  href={`/projects/${projectId}/deployment`}
                  style={{
                    display: "block", width: "100%", padding: "7px", textAlign: "center",
                    background: "rgba(139,92,246,.2)", color: "#cba6f7",
                    borderRadius: 6, fontSize: 12, fontWeight: 700,
                    border: "1px solid rgba(139,92,246,.3)",
                  }}
                >
                  Go to Deployment →
                </Link>
              </div>

              <div className="cockpit-panel-title" style={{ marginTop: 8 }}>Evidence</div>
              <div style={{ padding: "8px 14px" }}>
                <Link href={`/projects/${projectId}/evidence`} style={{ fontSize: 12, color: "#89b4fa" }}>
                  View Artifacts →
                </Link>
              </div>
            </div>
          </div>
        </div>
      </div>
    </AppShell>
  );
}
