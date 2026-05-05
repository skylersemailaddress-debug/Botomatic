"use client";
import { AppShell } from "@/components/shell/AppShell";

export default function GlobalSettingsPage() {
  return (
    <AppShell>
      <div className="page-wrap">
        <div className="page-topbar">
          <div className="page-topbar-left">
            <div className="page-eyebrow">Settings</div>
            <h2>Account Settings</h2>
            <p>Manage your account, workspace, and preferences.</p>
          </div>
          <div className="page-topbar-actions">
            <button type="button" className="btn btn--primary">Save Changes</button>
          </div>
        </div>
        <div className="page-body">
          <div className="panel-card">
            <div className="panel-card-header"><span className="panel-card-title">👤 Profile</span></div>
            <div className="panel-card-body" style={{ display: "flex", flexDirection: "column", gap: 14 }}>
              {[["Display Name","Botomatic User"],["Email","user@botomatic.ai"],["Workspace","My Workspace"]].map(([label, val]) => (
                <div key={label as string} style={{ display: "flex", flexDirection: "column", gap: 5 }}>
                  <label style={{ fontSize: 12, fontWeight: 600, color: "var(--text-2)", textTransform: "uppercase", letterSpacing: ".06em" }}>{label}</label>
                  <input defaultValue={val as string} style={{ padding: "9px 12px", border: "1.5px solid rgba(91,43,224,.18)", borderRadius: 8, fontSize: 13, color: "var(--text-1)", background: "#fff", outline: "none" }} />
                </div>
              ))}
            </div>
          </div>
          <div className="panel-card">
            <div className="panel-card-header"><span className="panel-card-title">🔑 API Keys</span></div>
            <div className="panel-card-body">
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "10px 0" }}>
                <div>
                  <div style={{ fontSize: 13, fontWeight: 600, color: "var(--text-1)" }}>Personal API Key</div>
                  <div style={{ fontSize: 12, color: "var(--text-3)", marginTop: 2, fontFamily: "monospace" }}>btm_••••••••••••••••</div>
                </div>
                <button type="button" className="btn btn--ghost">Regenerate</button>
              </div>
            </div>
          </div>
          <div className="panel-card">
            <div className="panel-card-header"><span className="panel-card-title">🔔 Notifications</span></div>
            <div className="panel-card-body" style={{ display: "flex", flexDirection: "column", gap: 12 }}>
              {["Deploy completed","Build failed","New comment","Weekly digest"].map((item) => (
                <div key={item} style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                  <span style={{ fontSize: 13, color: "var(--text-1)" }}>{item}</span>
                  <input type="checkbox" defaultChecked style={{ width: 16, height: 16, accentColor: "var(--brand)" }} />
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </AppShell>
  );
}
