"use client";

import { useState } from "react";
import { AppShell } from "@/components/shell/AppShell";

const SPEC_CHECKS = [
  { label: "Requirements defined", icon: "✓", verdict: "Pass", color: "var(--green)" },
  { label: "User flows documented", icon: "✓", verdict: "Pass", color: "var(--green)" },
  { label: "API contracts specified", icon: "⚠", verdict: "Warn", color: "var(--amber)" },
  { label: "Test coverage defined", icon: "⏳", verdict: "Pending", color: "var(--amber)" },
];

const BUILD_CONTRACT = [
  { label: "Build reproducible", icon: "✓", verdict: "Pass", color: "var(--green)" },
  { label: "Zero regressions", icon: "✓", verdict: "Pass", color: "var(--green)" },
  { label: "All validators passing", icon: "⏳", verdict: "Pending", color: "var(--amber)" },
];

const APP_READINESS = [
  { label: "Core features", icon: "✓", verdict: "Complete", color: "var(--green)" },
  { label: "Auth flow", icon: "⏳", verdict: "Pending", color: "var(--amber)" },
  { label: "Payment integration", icon: "✗", verdict: "Not started", color: "var(--red)" },
  { label: "Mobile responsive", icon: "✓", verdict: "Complete", color: "var(--green)" },
];

function StatusBadge({ label, color }: { label: string; color: string }) {
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
      {label}
    </span>
  );
}

export default function ValidatorsPage({ params }: { params: { projectId: string } }) {
  const { projectId } = params;
  const [running, setRunning] = useState(false);
  const [toast, setToast] = useState<string | null>(null);

  const handleRunValidators = () => {
    setRunning(true);
    setToast(null);
    setTimeout(() => {
      setRunning(false);
      setToast("All validators completed successfully.");
      setTimeout(() => setToast(null), 4000);
    }, 1500);
  };

  return (
    <AppShell projectId={projectId}>
      <div className="page-wrap">
        {/* Top bar */}
        <div className="page-topbar">
          <div className="page-topbar-left">
            <div className="page-eyebrow">Validators</div>
            <h1 style={{ fontSize: 22, fontWeight: 700, color: "var(--text-1)", margin: 0 }}>Validators</h1>
            <p style={{ color: "var(--text-2)", marginTop: 2 }}>Review spec completeness, build contracts, and app readiness.</p>
          </div>
          <div className="page-topbar-actions">
            <button
              type="button"
              className="btn btn--primary"
              onClick={handleRunValidators}
              disabled={running}
            >
              {running ? "Running…" : "Run Validators"}
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

        <div className="page-body">
          {/* Spec Completeness */}
          <div className="panel-card">
            <div className="panel-card-header">
              <span className="panel-card-title">Spec Completeness</span>
            </div>
            <div className="panel-card-body">
              {SPEC_CHECKS.map((check) => (
                <div key={check.label} style={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                  padding: "10px 0",
                  borderBottom: "1px solid var(--brand-border)",
                }}>
                  <span style={{ color: "var(--text-2)" }}>{check.label}</span>
                  <span style={{ display: "flex", alignItems: "center", gap: 8 }}>
                    <span style={{ color: check.color, fontWeight: 700 }}>{check.icon}</span>
                    <StatusBadge label={check.verdict} color={check.color} />
                  </span>
                </div>
              ))}
            </div>
          </div>

          {/* Build Contract */}
          <div className="panel-card" style={{ marginTop: 16 }}>
            <div className="panel-card-header">
              <span className="panel-card-title">Build Contract</span>
            </div>
            <div className="panel-card-body">
              {BUILD_CONTRACT.map((check) => (
                <div key={check.label} style={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                  padding: "10px 0",
                  borderBottom: "1px solid var(--brand-border)",
                }}>
                  <span style={{ color: "var(--text-2)" }}>{check.label}</span>
                  <span style={{ display: "flex", alignItems: "center", gap: 8 }}>
                    <span style={{ color: check.color, fontWeight: 700 }}>{check.icon}</span>
                    <StatusBadge label={check.verdict} color={check.color} />
                  </span>
                </div>
              ))}
            </div>
          </div>

          {/* App Readiness */}
          <div className="panel-card" style={{ marginTop: 16 }}>
            <div className="panel-card-header">
              <span className="panel-card-title">App Readiness</span>
            </div>
            <div className="panel-card-body">
              {APP_READINESS.map((item) => (
                <div key={item.label} style={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                  padding: "10px 0",
                  borderBottom: "1px solid var(--brand-border)",
                }}>
                  <span style={{ color: "var(--text-2)" }}>{item.label}</span>
                  <span style={{ display: "flex", alignItems: "center", gap: 8 }}>
                    <span style={{ color: item.color, fontWeight: 700 }}>{item.icon}</span>
                    <StatusBadge label={item.verdict} color={item.color} />
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </AppShell>
  );
}
