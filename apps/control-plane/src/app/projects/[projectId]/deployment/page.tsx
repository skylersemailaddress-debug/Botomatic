"use client";

import { useCallback, useState } from "react";
import Link from "next/link";
import { AppShell } from "@/components/shell/AppShell";
import { requestDeploy } from "@/services/launchProof";

const PREFLIGHT = [
  { id: "build",   label: "Build passing",          status: "ok"   as const, note: "npm run build succeeded" },
  { id: "tests",   label: "Test suite green",        status: "warn" as const, note: "2 tests skipped" },
  { id: "env",     label: "Environment variables",   status: "ok"   as const, note: "12 vars configured" },
  { id: "secrets", label: "Secrets vault",           status: "ok"   as const, note: "Encrypted at rest" },
  { id: "domain",  label: "Custom domain",           status: "warn" as const, note: "Using Railway default URL" },
  { id: "db",      label: "Database connection",     status: "ok"   as const, note: "Supabase connected" },
];

const PROVIDERS = [
  { name: "Railway",  icon: "🚂", ready: true,  note: "Connected" },
  { name: "Vercel",   icon: "▲",  ready: false, note: "Not configured" },
  { name: "Supabase", icon: "⚡", ready: true,  note: "DB connected" },
  { name: "Auth0",    icon: "🔐", ready: false, note: "Optional" },
];

const iconMap = { ok: "✓", warn: "!", fail: "✕", pending: "○" } as const;

export default function DeploymentPage({ params }: { params: { projectId: string } }) {
  const { projectId } = params;
  const [deploying, setDeploying] = useState(false);
  const [deployed, setDeployed] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const allOk = PREFLIGHT.every((c) => c.status === "ok");

  const handleDeploy = useCallback(async () => {
    setDeploying(true);
    setError(null);
    try {
      await requestDeploy(projectId, { idempotencyKey: `deploy_${Date.now()}` });
      setDeployed(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Deploy failed");
    } finally {
      setDeploying(false);
    }
  }, [projectId]);

  return (
    <AppShell projectId={projectId}>
      <div className="page-wrap">
        <div className="page-topbar">
          <div className="page-topbar-left">
            <div className="page-eyebrow">Deployment</div>
            <h2>Deploy Your App</h2>
            <p>Run preflight checks, review provider readiness, and launch.</p>
          </div>
          <div className="page-topbar-actions">
            <Link href={`/projects/${projectId}`} className="btn btn--ghost">← Vibe Mode</Link>
            <Link href={`/projects/${projectId}/advanced`} className="btn btn--ghost">Pro Cockpit</Link>
            <button
              type="button"
              className="btn btn--primary"
              disabled={deploying || deployed || !allOk}
              onClick={() => void handleDeploy()}
            >
              {deploying ? "Deploying…" : deployed ? "✓ Deployed" : "🚀 Deploy Now"}
            </button>
          </div>
        </div>

        <div className="page-body">
          {/* Gate banner */}
          <div className={`deploy-gate-banner${allOk ? " deploy-gate-banner--ready" : " deploy-gate-banner--blocked"}`}>
            <span className="deploy-gate-banner-icon">{allOk ? "✓" : "⚠"}</span>
            <span className="deploy-gate-banner-msg">
              {allOk ? "All preflight checks passed. Ready to deploy." : "Some checks need attention before deploying."}
            </span>
          </div>

          {error && <p className="intake-error">{error}</p>}

          {/* Provider readiness */}
          <div>
            <h3 style={{ fontSize: 13, fontWeight: 700, color: "var(--text-1)", marginBottom: 10 }}>Provider Readiness</h3>
            <div className="deploy-readiness">
              {PROVIDERS.map((p) => (
                <div key={p.name} className="deploy-readiness-item">
                  <span className="deploy-readiness-icon">{p.icon}</span>
                  <div>
                    <div className="deploy-readiness-label">{p.name}</div>
                    <div className="deploy-readiness-status" style={{ color: p.ready ? "var(--green)" : "var(--text-3)" }}>
                      {p.note}
                    </div>
                  </div>
                  <span style={{ marginLeft: "auto", background: p.ready ? "#dcfce7" : "#f3f4f6", color: p.ready ? "var(--green)" : "#6b7280", padding: "3px 9px", borderRadius: 20, fontSize: 11, fontWeight: 600 }}>
                    {p.ready ? "Ready" : "—"}
                  </span>
                </div>
              ))}
            </div>
          </div>

          {/* Preflight checklist */}
          <div>
            <h3 style={{ fontSize: 13, fontWeight: 700, color: "var(--text-1)", marginBottom: 10 }}>Preflight Checklist</h3>
            <div className="deploy-checklist">
              {PREFLIGHT.map((c) => (
                <div key={c.id} className={`deploy-check deploy-check--${c.status}`}>
                  <div className="deploy-check-icon">{iconMap[c.status]}</div>
                  <span className="deploy-check-label">{c.label}</span>
                  <span className="deploy-check-note">{c.note}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Rollback info */}
          <div className="panel-card">
            <div className="panel-card-header">
              <span className="panel-card-title">🔄 Rollback Plan</span>
            </div>
            <div className="panel-card-body">
              <p style={{ fontSize: 13, color: "var(--text-2)", lineHeight: 1.6 }}>
                If the deployment fails or causes issues, Railway will automatically revert to the previous healthy deployment.
                Rollback takes approximately 30 seconds. No data loss expected for read-only operations.
              </p>
            </div>
          </div>
        </div>
      </div>
    </AppShell>
  );
}
