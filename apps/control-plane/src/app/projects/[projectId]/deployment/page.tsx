"use client";

import { useEffect, useState } from "react";
import { AppShell } from "@/components/shell/AppShell";
import { getJsonSafe } from "@/services/api";
import { requestDeploy } from "@/services/launchProof";

interface Artifact {
  operationId: string;
  status: string;
  branchName?: string;
  prUrl?: string;
  error?: string;
}

interface ArtifactsResponse {
  artifacts: Artifact[];
}

const PREFLIGHT_CHECKS = [
  { label: "TypeScript build", icon: "✓", status: "Pass", color: "var(--green)" },
  { label: "ESLint", icon: "✓", status: "Pass", color: "var(--green)" },
  { label: "Unit tests", icon: "✓", status: "Pass", color: "var(--green)" },
  { label: "Security scan", icon: "⏳", status: "Running", color: "var(--amber)" },
  { label: "Performance", icon: "✓", status: "92/100", color: "var(--green)" },
];

const PROVIDERS = [
  { name: "Vercel", icon: "▲", description: "Frontend & serverless" },
  { name: "Railway", icon: "🚂", description: "Full-stack & databases" },
  { name: "Supabase", icon: "⚡", description: "Postgres & auth" },
];

function statusBadge(status: string) {
  let color = "var(--text-3)";
  if (status === "success" || status === "completed") color = "var(--green)";
  else if (status === "failed" || status === "error") color = "var(--red)";
  else if (status === "running" || status === "pending") color = "var(--amber)";
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
      {status}
    </span>
  );
}

export default function DeploymentPage({ params }: { params: { projectId: string } }) {
  const { projectId } = params;
  const [deploying, setDeploying] = useState(false);
  const [deployResult, setDeployResult] = useState<{ ok: boolean; message: string } | null>(null);
  const [artifacts, setArtifacts] = useState<Artifact[]>([]);
  const [artifactsError, setArtifactsError] = useState<string | null>(null);

  useEffect(() => {
    void (async () => {
      const res = await getJsonSafe<ArtifactsResponse>(`/api/projects/${projectId}/ui/artifacts`);
      if (res.ok) {
        setArtifacts(res.data.artifacts ?? []);
      } else if (res.status === 403) {
        setArtifactsError("Requires reviewer access");
      } else {
        setArtifactsError("Could not load deployments");
      }
    })();
  }, [projectId]);

  const handleDeploy = async () => {
    setDeploying(true);
    setDeployResult(null);
    try {
      const result = await requestDeploy(projectId, { idempotencyKey: `deploy_${Date.now()}` });
      if (result.ok) {
        setDeployResult({ ok: true, message: result.data?.message ?? "Deploy initiated successfully." });
      } else {
        setDeployResult({ ok: false, message: result.message ?? "Deploy failed." });
      }
    } catch (err) {
      setDeployResult({ ok: false, message: err instanceof Error ? err.message : "Deploy failed." });
    } finally {
      setDeploying(false);
    }
  };

  const allPreflightPass = PREFLIGHT_CHECKS.every((c) => c.icon === "✓");

  return (
    <AppShell projectId={projectId}>
      <div className="page-wrap">
        {/* Top bar */}
        <div className="page-topbar">
          <div className="page-topbar-left">
            <div className="page-eyebrow">Deploy</div>
            <h1 style={{ fontSize: 22, fontWeight: 700, color: "var(--text-1)", margin: 0 }}>Deployment</h1>
            <p style={{ color: "var(--text-2)", marginTop: 2 }}>Deploy your application to production.</p>
          </div>
          <div className="page-topbar-actions">
            <button
              type="button"
              className="btn btn--primary"
              onClick={() => void handleDeploy()}
              disabled={deploying}
            >
              {deploying ? "Deploying…" : "🚀 Deploy Now"}
            </button>
          </div>
        </div>

        {/* Deploy result toast */}
        {deployResult && (
          <div style={{
            padding: "10px 16px",
            borderRadius: 8,
            marginBottom: 16,
            background: deployResult.ok ? "#dcfce7" : "#fee2e2",
            color: deployResult.ok ? "var(--green)" : "var(--red)",
            fontWeight: 600,
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
          }}>
            <span>{deployResult.ok ? "✓" : "✗"} {deployResult.message}</span>
            <button type="button" onClick={() => setDeployResult(null)} style={{ color: "inherit", opacity: 0.6 }}>✕</button>
          </div>
        )}

        {/* Ready to deploy banner */}
        {allPreflightPass && (
          <div style={{
            padding: "10px 16px",
            borderRadius: 8,
            marginBottom: 16,
            background: "#dcfce7",
            color: "var(--green)",
            fontWeight: 600,
          }}>
            ✓ Ready to deploy — all preflight checks passed.
          </div>
        )}

        <div className="page-body">
          {/* Preflight Checks */}
          <div className="panel-card">
            <div className="panel-card-header">
              <span className="panel-card-title">Preflight Checks</span>
            </div>
            <div className="panel-card-body">
              {PREFLIGHT_CHECKS.map((check) => (
                <div key={check.label} style={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                  padding: "10px 0",
                  borderBottom: "1px solid var(--brand-border)",
                }}>
                  <span style={{ color: "var(--text-2)" }}>{check.label}</span>
                  <span style={{ display: "flex", alignItems: "center", gap: 6 }}>
                    <span style={{ color: check.color, fontWeight: 700 }}>{check.icon}</span>
                    <span style={{ color: check.color, fontWeight: 600, fontSize: 13 }}>{check.status}</span>
                  </span>
                </div>
              ))}
            </div>
          </div>

          {/* Deploy Target */}
          <div className="panel-card" style={{ marginTop: 16 }}>
            <div className="panel-card-header">
              <span className="panel-card-title">Deploy Target</span>
            </div>
            <div className="panel-card-body">
              <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(180px, 1fr))", gap: 12 }}>
                {PROVIDERS.map((p) => (
                  <div key={p.name} style={{
                    border: "var(--card-border)",
                    borderRadius: 10,
                    padding: "14px 16px",
                    display: "flex",
                    flexDirection: "column",
                    gap: 6,
                  }}>
                    <div style={{ fontSize: 22 }}>{p.icon}</div>
                    <div style={{ fontWeight: 700, color: "var(--text-1)" }}>{p.name}</div>
                    <div style={{ fontSize: 12, color: "var(--text-3)" }}>{p.description}</div>
                    <div style={{ fontSize: 12, color: "var(--text-3)", marginTop: 4 }}>Not connected</div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Recent Deployments */}
          <div className="panel-card" style={{ marginTop: 16 }}>
            <div className="panel-card-header">
              <span className="panel-card-title">Recent Deployments</span>
            </div>
            <div className="panel-card-body">
              {artifactsError ? (
                <div className="panel-empty">{artifactsError}</div>
              ) : artifacts.length === 0 ? (
                <div className="panel-empty">No deployments yet.</div>
              ) : (
                artifacts.map((a) => (
                  <div key={a.operationId} style={{
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "space-between",
                    padding: "10px 0",
                    borderBottom: "1px solid var(--brand-border)",
                    gap: 8,
                  }}>
                    <span style={{ color: "var(--text-2)", fontSize: 13 }}>
                      {a.branchName ?? a.operationId}
                    </span>
                    <span style={{ display: "flex", alignItems: "center", gap: 8 }}>
                      {statusBadge(a.status)}
                      {a.prUrl && (
                        <a
                          href={a.prUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          style={{ color: "var(--brand)", fontSize: 12, fontWeight: 600 }}
                        >
                          View PR →
                        </a>
                      )}
                    </span>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      </div>
    </AppShell>
  );
}
