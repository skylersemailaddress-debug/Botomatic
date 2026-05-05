"use client";

import { useEffect, useState } from "react";
import { AppShell } from "@/components/shell/AppShell";
import { getJsonSafe, patchJson } from "@/services/api";

interface ProjectStatus {
  name: string;
  approvalMode: string;
  status: string;
}

const APPROVAL_MODES = [
  { id: "autopilot", label: "Autonomous", icon: "🤖", description: "Full autopilot — no approvals required" },
  { id: "guided", label: "Guided", icon: "🧭", description: "Suggests actions, you confirm" },
  { id: "strict", label: "Manual", icon: "👤", description: "All changes require explicit approval" },
  { id: "enterprise", label: "Enterprise", icon: "🏢", description: "Multi-team approval workflow" },
];

export default function SettingsPage({ params }: { params: { projectId: string } }) {
  const { projectId } = params;
  const [name, setName] = useState("");
  const [approvalMode, setApprovalMode] = useState("guided");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saveResult, setSaveResult] = useState<{ ok: boolean; message: string } | null>(null);
  const [deleteConfirmed, setDeleteConfirmed] = useState(false);

  useEffect(() => {
    void (async () => {
      const res = await getJsonSafe<ProjectStatus>(`/api/projects/${projectId}/status`);
      if (res.ok) {
        setName(res.data.name ?? "");
        setApprovalMode(res.data.approvalMode ?? "guided");
      }
      setLoading(false);
    })();
  }, [projectId]);

  const handleSave = async () => {
    setSaving(true);
    setSaveResult(null);
    try {
      const res = await patchJson(`/api/projects/${projectId}/settings`, { name, approvalMode });
      if (res && typeof res === "object" && (res as Record<string, unknown>).ok !== false) {
        setSaveResult({ ok: true, message: "Settings saved successfully." });
      } else {
        setSaveResult({ ok: false, message: "Failed to save settings." });
      }
    } catch (err) {
      setSaveResult({ ok: false, message: err instanceof Error ? err.message : "Failed to save settings." });
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = () => {
    const confirmed = window.confirm("Are you sure you want to delete this project? This action cannot be undone.");
    if (confirmed) {
      setDeleteConfirmed(true);
      window.alert("Project deletion is not yet available. Contact support.");
    }
  };

  return (
    <AppShell projectId={projectId}>
      <div className="page-wrap">
        {/* Top bar */}
        <div className="page-topbar">
          <div className="page-topbar-left">
            <div className="page-eyebrow">Settings</div>
            <h1 style={{ fontSize: 22, fontWeight: 700, color: "var(--text-1)", margin: 0 }}>Project Settings</h1>
            <p style={{ color: "var(--text-2)", marginTop: 2 }}>Configure your project name, approval mode, and integrations.</p>
          </div>
          <div className="page-topbar-actions">
            <button
              type="button"
              className="btn btn--primary"
              onClick={() => void handleSave()}
              disabled={saving || loading}
            >
              {saving ? "Saving…" : "Save Changes"}
            </button>
          </div>
        </div>

        {/* Save result toast */}
        {saveResult && (
          <div style={{
            padding: "10px 16px",
            borderRadius: 8,
            marginBottom: 16,
            background: saveResult.ok ? "#dcfce7" : "#fee2e2",
            color: saveResult.ok ? "var(--green)" : "var(--red)",
            fontWeight: 600,
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
          }}>
            <span>{saveResult.ok ? "✓" : "✗"} {saveResult.message}</span>
            <button type="button" onClick={() => setSaveResult(null)} style={{ color: "inherit", opacity: 0.6 }}>✕</button>
          </div>
        )}

        <div className="page-body">
          {/* General */}
          <div className="panel-card">
            <div className="panel-card-header">
              <span className="panel-card-title">General</span>
            </div>
            <div className="panel-card-body">
              <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
                <div>
                  <label style={{ display: "block", fontSize: 12, fontWeight: 600, color: "var(--text-2)", marginBottom: 6 }}>
                    Project ID
                  </label>
                  <input
                    type="text"
                    value={projectId}
                    readOnly
                    style={{
                      width: "100%",
                      padding: "8px 12px",
                      borderRadius: 8,
                      border: "1px solid var(--brand-border)",
                      background: "var(--surface-2, #f8f8f8)",
                      color: "var(--text-3)",
                      fontSize: 13,
                      boxSizing: "border-box",
                      cursor: "default",
                    }}
                  />
                </div>
                <div>
                  <label style={{ display: "block", fontSize: 12, fontWeight: 600, color: "var(--text-2)", marginBottom: 6 }}>
                    Project Name
                  </label>
                  <input
                    type="text"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    disabled={loading}
                    placeholder={loading ? "Loading…" : "Enter project name"}
                    style={{
                      width: "100%",
                      padding: "8px 12px",
                      borderRadius: 8,
                      border: "1px solid var(--brand-border)",
                      background: "transparent",
                      color: "var(--text-1)",
                      fontSize: 13,
                      boxSizing: "border-box",
                    }}
                  />
                </div>
              </div>
            </div>
          </div>

          {/* Approval Mode */}
          <div className="panel-card" style={{ marginTop: 16 }}>
            <div className="panel-card-header">
              <span className="panel-card-title">Approval Mode</span>
            </div>
            <div className="panel-card-body">
              <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(180px, 1fr))", gap: 12 }}>
                {APPROVAL_MODES.map((mode) => {
                  const selected = approvalMode === mode.id;
                  return (
                    <button
                      key={mode.id}
                      type="button"
                      onClick={() => setApprovalMode(mode.id)}
                      style={{
                        padding: "14px 16px",
                        borderRadius: 10,
                        border: selected ? "2px solid var(--brand)" : "1px solid var(--brand-border)",
                        background: selected ? "color-mix(in srgb, var(--brand) 10%, transparent)" : "transparent",
                        cursor: "pointer",
                        textAlign: "left",
                        display: "flex",
                        flexDirection: "column",
                        gap: 6,
                        transition: "border-color 0.15s, background 0.15s",
                      }}
                    >
                      <div style={{ fontSize: 22 }}>{mode.icon}</div>
                      <div style={{ fontWeight: 700, color: selected ? "var(--brand)" : "var(--text-1)", fontSize: 14 }}>
                        {mode.label}
                      </div>
                      <div style={{ fontSize: 11, color: "var(--text-3)", lineHeight: 1.4 }}>{mode.description}</div>
                    </button>
                  );
                })}
              </div>
            </div>
          </div>

          {/* GitHub Integration */}
          <div className="panel-card" style={{ marginTop: 16 }}>
            <div className="panel-card-header">
              <span className="panel-card-title">GitHub Integration</span>
            </div>
            <div className="panel-card-body">
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                <div>
                  <div style={{ fontWeight: 600, color: "var(--text-1)", marginBottom: 4 }}>Not connected</div>
                  <div style={{ fontSize: 12, color: "var(--text-3)" }}>Connect your GitHub account to enable repository sync and PR workflows.</div>
                </div>
                <a
                  href={`/projects/new?s=github&projectId=${projectId}`}
                  className="btn btn--ghost"
                  style={{ whiteSpace: "nowrap", flexShrink: 0, marginLeft: 16 }}
                >
                  Connect GitHub →
                </a>
              </div>
            </div>
          </div>

          {/* Danger Zone */}
          <div
            className="panel-card"
            style={{ marginTop: 16, border: "1px solid var(--red)", borderRadius: 12 }}
          >
            <div className="panel-card-header" style={{ borderBottom: "1px solid var(--red)" }}>
              <span className="panel-card-title" style={{ color: "var(--red)" }}>Danger Zone</span>
            </div>
            <div className="panel-card-body">
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                <div>
                  <div style={{ fontWeight: 600, color: "var(--text-1)", marginBottom: 4 }}>Delete Project</div>
                  <div style={{ fontSize: 12, color: "var(--text-3)" }}>
                    Permanently delete this project and all associated data. This cannot be undone.
                  </div>
                  {deleteConfirmed && (
                    <div style={{ fontSize: 12, color: "var(--red)", marginTop: 6, fontWeight: 600 }}>
                      Project deletion is not yet available. Contact support.
                    </div>
                  )}
                </div>
                <button
                  type="button"
                  className="btn btn--danger"
                  onClick={handleDelete}
                  style={{ whiteSpace: "nowrap", flexShrink: 0, marginLeft: 16 }}
                >
                  Delete Project
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </AppShell>
  );
}
