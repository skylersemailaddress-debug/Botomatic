"use client";

import { useState } from "react";
import Link from "next/link";
import { AppShell } from "@/components/shell/AppShell";

export default function SettingsPage({ params }: { params: { projectId: string } }) {
  const { projectId } = params;
  const [approvalMode, setApprovalMode] = useState<"auto" | "manual">("auto");
  const [saved, setSaved] = useState(false);

  function handleSave() {
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  }

  return (
    <AppShell projectId={projectId}>
      <div className="page-wrap">
        <div className="page-topbar">
          <div className="page-topbar-left">
            <div className="page-eyebrow">Settings</div>
            <h2>Project Settings</h2>
            <p>Configure project options, approval gates, and integrations.</p>
          </div>
          <div className="page-topbar-actions">
            <Link href={`/projects/${projectId}`} className="btn btn--ghost">← Vibe Mode</Link>
            <button type="button" className="btn btn--primary" onClick={handleSave}>
              {saved ? "✓ Saved" : "Save Changes"}
            </button>
          </div>
        </div>

        <div className="page-body">
          {/* General */}
          <div className="panel-card">
            <div className="panel-card-header">
              <span className="panel-card-title">⚙ General</span>
            </div>
            <div className="panel-card-body" style={{ display: "flex", flexDirection: "column", gap: 16 }}>
              <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                <label style={{ fontSize: 13, fontWeight: 600, color: "var(--text-1)" }}>Project ID</label>
                <input
                  readOnly value={projectId}
                  style={{ padding: "8px 12px", border: "1px solid rgba(91,43,224,.15)", borderRadius: 8, fontSize: 12, fontFamily: "monospace", color: "var(--text-2)", background: "#fafafe" }}
                />
              </div>
              <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                <label style={{ fontSize: 13, fontWeight: 600, color: "var(--text-1)" }}>Approval Mode</label>
                <div style={{ display: "flex", gap: 8 }}>
                  {(["auto", "manual"] as const).map((m) => (
                    <button
                      key={m}
                      type="button"
                      onClick={() => setApprovalMode(m)}
                      style={{
                        flex: 1, padding: "9px", borderRadius: 8, fontSize: 13, fontWeight: 600,
                        background: approvalMode === m ? "var(--brand)" : "#f5f3ff",
                        color: approvalMode === m ? "#fff" : "var(--text-2)",
                        border: `1px solid ${approvalMode === m ? "var(--brand)" : "rgba(91,43,224,.15)"}`,
                        transition: "all .12s",
                      }}
                    >
                      {m === "auto" ? "🤖 Autonomous" : "👤 Manual Approval"}
                    </button>
                  ))}
                </div>
                <p style={{ fontSize: 12, color: "var(--text-3)" }}>
                  {approvalMode === "auto" ? "Botomatic will apply all changes automatically." : "You will approve each significant change before it's applied."}
                </p>
              </div>
            </div>
          </div>

          {/* GitHub Integration */}
          <div className="panel-card">
            <div className="panel-card-header">
              <span className="panel-card-title">⌥ GitHub Integration</span>
            </div>
            <div className="panel-card-body" style={{ display: "flex", flexDirection: "column", gap: 10 }}>
              <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: 13, fontWeight: 600, color: "var(--text-1)" }}>Repository</div>
                  <div style={{ fontSize: 12, color: "var(--text-3)", marginTop: 2 }}>Not connected</div>
                </div>
                <button type="button" className="btn btn--ghost">Connect GitHub →</button>
              </div>
            </div>
          </div>

          {/* Danger zone */}
          <div className="panel-card" style={{ border: "1px solid rgba(220,38,38,.2)" }}>
            <div className="panel-card-header">
              <span className="panel-card-title" style={{ color: "var(--red)" }}>⚠ Danger Zone</span>
            </div>
            <div className="panel-card-body" style={{ display: "flex", alignItems: "center", gap: 12 }}>
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: 13, fontWeight: 600, color: "var(--text-1)" }}>Delete Project</div>
                <div style={{ fontSize: 12, color: "var(--text-3)", marginTop: 2 }}>This action cannot be undone.</div>
              </div>
              <button type="button" className="btn btn--danger">Delete Project</button>
            </div>
          </div>
        </div>
      </div>
    </AppShell>
  );
}
