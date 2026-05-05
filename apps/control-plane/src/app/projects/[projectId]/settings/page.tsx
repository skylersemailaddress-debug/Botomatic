"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { AppShell } from "@/components/shell/AppShell";
import { patchJson, getJsonSafe } from "@/services/api";

type ApprovalMode = "strict" | "guided" | "autopilot" | "enterprise";

const MODE_INFO: Record<ApprovalMode, { label: string; icon: string; desc: string }> = {
  autopilot:  { label: "Autonomous",       icon: "🤖", desc: "Botomatic applies all changes automatically." },
  guided:     { label: "Guided",           icon: "🧭", desc: "You approve major decisions; minor ones auto-apply." },
  strict:     { label: "Manual Approval",  icon: "👤", desc: "You approve every significant change before it's applied." },
  enterprise: { label: "Enterprise",       icon: "🏢", desc: "Full audit trail, dual approval required for production." },
};

export default function SettingsPage({ params }: { params: { projectId: string } }) {
  const { projectId } = params;
  const [projectName, setProjectName] = useState("");
  const [approvalMode, setApprovalMode] = useState<ApprovalMode>("autopilot");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    getJsonSafe<{ name?: string; approvalMode?: string }>(`/api/projects/${projectId}/status`)
      .then((r) => {
        if (r.ok) {
          setProjectName(r.data.name ?? "");
          if (r.data.approvalMode && r.data.approvalMode in MODE_INFO) {
            setApprovalMode(r.data.approvalMode as ApprovalMode);
          }
        }
      })
      .catch(() => undefined)
      .finally(() => setLoading(false));
  }, [projectId]);

  async function handleSave() {
    setSaving(true);
    setError(null);
    try {
      await patchJson(`/api/projects/${projectId}/settings`, {
        name: projectName.trim() || undefined,
        approvalMode,
      });
      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Save failed");
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete() {
    if (!window.confirm(`Delete project ${projectId}? This cannot be undone.`)) return;
    // No delete endpoint yet — show informative message
    setError("Project deletion is not yet available. Contact support to remove a project.");
  }

  return (
    <AppShell projectId={projectId}>
      <div className="page-wrap">
        <div className="page-topbar">
          <div className="page-topbar-left">
            <div className="page-eyebrow">Settings</div>
            <h2>Project Settings</h2>
            <p>Configure project name, approval mode, and integrations.</p>
          </div>
          <div className="page-topbar-actions">
            <Link href={`/projects/${projectId}`} className="btn btn--ghost">← Vibe Mode</Link>
            <button
              type="button"
              className="btn btn--primary"
              onClick={() => void handleSave()}
              disabled={saving || loading}
            >
              {saving ? "Saving…" : saved ? "✓ Saved" : "Save Changes"}
            </button>
          </div>
        </div>

        <div className="page-body">
          {error && <p className="intake-error">{error}</p>}

          {/* General */}
          <div className="panel-card">
            <div className="panel-card-header">
              <span className="panel-card-title">⚙ General</span>
            </div>
            <div className="panel-card-body" style={{ display: "flex", flexDirection: "column", gap: 16 }}>
              <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                <label style={{ fontSize: 13, fontWeight: 600, color: "var(--text-1)" }}>Project ID</label>
                <input
                  readOnly
                  value={projectId}
                  style={{ padding: "8px 12px", border: "1px solid rgba(91,43,224,.15)", borderRadius: 8, fontSize: 12, fontFamily: "monospace", color: "var(--text-2)", background: "#fafafe" }}
                />
              </div>
              <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                <label style={{ fontSize: 13, fontWeight: 600, color: "var(--text-1)" }}>Project Name</label>
                <input
                  type="text"
                  value={projectName}
                  onChange={(e) => setProjectName(e.target.value)}
                  disabled={loading}
                  placeholder="My Project"
                  style={{ padding: "9px 12px", border: "1.5px solid rgba(91,43,224,.2)", borderRadius: 8, fontSize: 13, color: "var(--text-1)", outline: "none", background: "#fff" }}
                />
              </div>
            </div>
          </div>

          {/* Approval Mode */}
          <div className="panel-card">
            <div className="panel-card-header">
              <span className="panel-card-title">🔒 Approval Mode</span>
            </div>
            <div className="panel-card-body">
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
                {(Object.entries(MODE_INFO) as [ApprovalMode, typeof MODE_INFO[ApprovalMode]][]).map(([mode, info]) => (
                  <button
                    key={mode}
                    type="button"
                    onClick={() => setApprovalMode(mode)}
                    style={{
                      padding: "12px", borderRadius: 10, textAlign: "left", transition: "all .12s",
                      background: approvalMode === mode ? "var(--brand-soft)" : "#fafafe",
                      border: `1.5px solid ${approvalMode === mode ? "var(--brand)" : "rgba(91,43,224,.12)"}`,
                    }}
                  >
                    <div style={{ fontSize: 18, marginBottom: 4 }}>{info.icon}</div>
                    <div style={{ fontSize: 13, fontWeight: 700, color: approvalMode === mode ? "var(--brand)" : "var(--text-1)" }}>{info.label}</div>
                    <div style={{ fontSize: 11, color: "var(--text-3)", marginTop: 3, lineHeight: 1.4 }}>{info.desc}</div>
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* GitHub Integration */}
          <div className="panel-card">
            <div className="panel-card-header">
              <span className="panel-card-title">⌥ GitHub Integration</span>
            </div>
            <div className="panel-card-body" style={{ display: "flex", alignItems: "center", gap: 12 }}>
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: 13, fontWeight: 600, color: "var(--text-1)" }}>Repository</div>
                <div style={{ fontSize: 12, color: "var(--text-3)", marginTop: 2 }}>Not connected</div>
              </div>
              <Link href={`/projects/new?s=github&projectId=${projectId}`} className="btn btn--ghost">Connect GitHub →</Link>
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
                <div style={{ fontSize: 12, color: "var(--text-3)", marginTop: 2 }}>Permanently remove this project and all its data.</div>
              </div>
              <button type="button" className="btn btn--danger" onClick={() => void handleDelete()}>Delete Project</button>
            </div>
          </div>
        </div>
      </div>
    </AppShell>
  );
}
