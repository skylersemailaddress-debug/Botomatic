"use client";

import { useState } from "react";
import { AppShell } from "@/components/shell/AppShell";

interface SecretRow {
  name: string;
  environment: string;
}

interface ConnectedService {
  name: string;
  icon: string;
  connected: boolean;
}

const INITIAL_SECRETS: SecretRow[] = [
  { name: "DATABASE_URL", environment: "Production" },
  { name: "API_KEY", environment: "All" },
  { name: "STRIPE_SECRET", environment: "Production" },
];

const INITIAL_SERVICES: ConnectedService[] = [
  { name: "Supabase", icon: "⚡", connected: true },
  { name: "Stripe", icon: "💳", connected: false },
  { name: "SendGrid", icon: "📧", connected: false },
];

export default function VaultPage({ params }: { params: { projectId: string } }) {
  const { projectId } = params;
  const [secrets, setSecrets] = useState<SecretRow[]>(INITIAL_SECRETS);
  const [services, setServices] = useState<ConnectedService[]>(INITIAL_SERVICES);
  const [showAddForm, setShowAddForm] = useState(false);
  const [newName, setNewName] = useState("");
  const [newValue, setNewValue] = useState("");
  const [newEnv, setNewEnv] = useState("Production");
  const [copiedName, setCopiedName] = useState<string | null>(null);
  const [toast, setToast] = useState<string | null>(null);

  const handleCopy = (name: string) => {
    void navigator.clipboard.writeText(`••••••••• (${name})`);
    setCopiedName(name);
    setTimeout(() => setCopiedName(null), 1500);
  };

  const handleDelete = (name: string) => {
    if (window.confirm(`Delete secret "${name}"?`)) {
      setSecrets((prev) => prev.filter((s) => s.name !== name));
      showToast(`Secret "${name}" deleted.`);
    }
  };

  const handleAddSecret = () => {
    if (!newName.trim()) return;
    setSecrets((prev) => [...prev, { name: newName.trim(), environment: newEnv }]);
    showToast(`Secret "${newName.trim()}" added.`);
    setNewName("");
    setNewValue("");
    setNewEnv("Production");
    setShowAddForm(false);
  };

  const toggleService = (name: string) => {
    setServices((prev) =>
      prev.map((s) =>
        s.name === name ? { ...s, connected: !s.connected } : s
      )
    );
    const svc = services.find((s) => s.name === name);
    if (svc) {
      showToast(svc.connected ? `${name} disconnected.` : `${name} connected.`);
    }
  };

  const showToast = (msg: string) => {
    setToast(msg);
    setTimeout(() => setToast(null), 3000);
  };

  return (
    <AppShell projectId={projectId}>
      <div className="page-wrap">
        {/* Top bar */}
        <div className="page-topbar">
          <div className="page-topbar-left">
            <div className="page-eyebrow">Vault</div>
            <h1 style={{ fontSize: 22, fontWeight: 700, color: "var(--text-1)", margin: 0 }}>Secrets &amp; Credentials</h1>
            <p style={{ color: "var(--text-2)", marginTop: 2 }}>Manage environment variables and connected service credentials.</p>
          </div>
          <div className="page-topbar-actions">
            <button
              type="button"
              className="btn btn--primary"
              onClick={() => setShowAddForm((v) => !v)}
            >
              {showAddForm ? "Cancel" : "Add Secret"}
            </button>
          </div>
        </div>

        {/* Toast */}
        {toast && (
          <div style={{
            padding: "10px 16px",
            borderRadius: 8,
            marginBottom: 16,
            background: "#dcfce7",
            color: "var(--green)",
            fontWeight: 600,
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
          }}>
            <span>✓ {toast}</span>
            <button type="button" onClick={() => setToast(null)} style={{ color: "inherit", opacity: 0.6 }}>✕</button>
          </div>
        )}

        {/* Inline Add Secret form */}
        {showAddForm && (
          <div className="panel-card" style={{ marginBottom: 16 }}>
            <div className="panel-card-header">
              <span className="panel-card-title">New Secret</span>
            </div>
            <div className="panel-card-body">
              <div style={{ display: "flex", gap: 12, flexWrap: "wrap", alignItems: "flex-end" }}>
                <div style={{ flex: "1 1 180px" }}>
                  <label style={{ display: "block", fontSize: 12, fontWeight: 600, color: "var(--text-2)", marginBottom: 6 }}>Name</label>
                  <input
                    type="text"
                    value={newName}
                    onChange={(e) => setNewName(e.target.value)}
                    placeholder="MY_SECRET"
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
                <div style={{ flex: "1 1 180px" }}>
                  <label style={{ display: "block", fontSize: 12, fontWeight: 600, color: "var(--text-2)", marginBottom: 6 }}>Value</label>
                  <input
                    type="password"
                    value={newValue}
                    onChange={(e) => setNewValue(e.target.value)}
                    placeholder="••••••••••••"
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
                <div style={{ flex: "1 1 140px" }}>
                  <label style={{ display: "block", fontSize: 12, fontWeight: 600, color: "var(--text-2)", marginBottom: 6 }}>Environment</label>
                  <select
                    value={newEnv}
                    onChange={(e) => setNewEnv(e.target.value)}
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
                  >
                    <option value="Production">Production</option>
                    <option value="Preview">Preview</option>
                    <option value="Development">Development</option>
                    <option value="All">All</option>
                  </select>
                </div>
                <button
                  type="button"
                  className="btn btn--primary"
                  onClick={handleAddSecret}
                  disabled={!newName.trim()}
                  style={{ flexShrink: 0 }}
                >
                  Save
                </button>
              </div>
            </div>
          </div>
        )}

        <div className="page-body">
          {/* Environment Variables */}
          <div className="panel-card">
            <div className="panel-card-header">
              <span className="panel-card-title">Environment Variables</span>
            </div>
            <div className="panel-card-body">
              {secrets.length === 0 ? (
                <div className="panel-empty">No secrets configured.</div>
              ) : (
                <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
                  <thead>
                    <tr style={{ borderBottom: "1px solid var(--brand-border)" }}>
                      <th style={{ textAlign: "left", padding: "8px 0", color: "var(--text-3)", fontWeight: 600 }}>Name</th>
                      <th style={{ textAlign: "left", padding: "8px 0", color: "var(--text-3)", fontWeight: 600 }}>Value</th>
                      <th style={{ textAlign: "left", padding: "8px 0", color: "var(--text-3)", fontWeight: 600 }}>Environment</th>
                      <th style={{ textAlign: "right", padding: "8px 0", color: "var(--text-3)", fontWeight: 600 }}>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {secrets.map((secret) => (
                      <tr key={secret.name} style={{ borderBottom: "1px solid var(--brand-border)" }}>
                        <td style={{ padding: "10px 0", color: "var(--text-1)", fontFamily: "monospace", fontWeight: 600 }}>
                          {secret.name}
                        </td>
                        <td style={{ padding: "10px 0", color: "var(--text-3)", fontFamily: "monospace" }}>
                          •••••••••
                        </td>
                        <td style={{ padding: "10px 0" }}>
                          <span style={{
                            display: "inline-block",
                            padding: "2px 8px",
                            borderRadius: 20,
                            fontSize: 11,
                            fontWeight: 600,
                            background: "var(--brand-border)",
                            color: "var(--text-2)",
                          }}>
                            {secret.environment}
                          </span>
                        </td>
                        <td style={{ padding: "10px 0", textAlign: "right" }}>
                          <span style={{ display: "inline-flex", gap: 8 }}>
                            <button
                              type="button"
                              className="btn btn--ghost"
                              style={{ padding: "3px 10px", fontSize: 12 }}
                              onClick={() => handleCopy(secret.name)}
                            >
                              {copiedName === secret.name ? "Copied!" : "Copy"}
                            </button>
                            <button
                              type="button"
                              className="btn btn--danger"
                              style={{ padding: "3px 10px", fontSize: 12 }}
                              onClick={() => handleDelete(secret.name)}
                            >
                              Delete
                            </button>
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
          </div>

          {/* Connected Services */}
          <div className="panel-card" style={{ marginTop: 16 }}>
            <div className="panel-card-header">
              <span className="panel-card-title">Connected Services</span>
            </div>
            <div className="panel-card-body">
              {services.map((svc) => (
                <div key={svc.name} style={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                  padding: "12px 0",
                  borderBottom: "1px solid var(--brand-border)",
                }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                    <span style={{ fontSize: 22 }}>{svc.icon}</span>
                    <div>
                      <div style={{ fontWeight: 600, color: "var(--text-1)", fontSize: 14 }}>{svc.name}</div>
                      <div style={{ fontSize: 12, color: svc.connected ? "var(--green)" : "var(--text-3)" }}>
                        {svc.connected ? "✓ Connected" : "Not connected"}
                      </div>
                    </div>
                  </div>
                  <button
                    type="button"
                    className={svc.connected ? "btn btn--ghost" : "btn btn--primary"}
                    style={{ fontSize: 12, padding: "5px 14px" }}
                    onClick={() => toggleService(svc.name)}
                  >
                    {svc.connected ? "Disconnect" : "Connect"}
                  </button>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </AppShell>
  );
}
