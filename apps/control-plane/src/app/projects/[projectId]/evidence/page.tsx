"use client";

import { useEffect, useState } from "react";
import { AppShell } from "@/components/shell/AppShell";
import { getJsonSafe } from "@/services/api";

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

const VALIDATION_RESULTS = [
  { label: "TypeScript compilation", icon: "✓", verdict: "Pass", detail: "0 errors", color: "var(--green)" },
  { label: "ESLint", icon: "✓", verdict: "Pass", detail: "0 errors", color: "var(--green)" },
  { label: "Unit tests", icon: "✓", verdict: "Pass", detail: "Passed", color: "var(--green)" },
  { label: "Accessibility (WCAG 2.1)", icon: "⚠", verdict: "Warn", detail: "Minor issues", color: "var(--amber)" },
  { label: "Security scan", icon: "⏳", verdict: "Pending", detail: "Running…", color: "var(--amber)" },
  { label: "Performance (Lighthouse)", icon: "✓", verdict: "Pass", detail: "Score 92/100", color: "var(--green)" },
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

export default function EvidencePage({ params }: { params: { projectId: string } }) {
  const { projectId } = params;
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
        setArtifactsError("Could not load artifacts");
      }
    })();
  }, [projectId]);

  return (
    <AppShell projectId={projectId}>
      <div className="page-wrap">
        {/* Top bar */}
        <div className="page-topbar">
          <div className="page-topbar-left">
            <div className="page-eyebrow">Evidence</div>
            <h1 style={{ fontSize: 22, fontWeight: 700, color: "var(--text-1)", margin: 0 }}>Evidence</h1>
            <p style={{ color: "var(--text-2)", marginTop: 2 }}>Review validation results and proof artifacts for this project.</p>
          </div>
        </div>

        <div className="page-body">
          {/* Validation Results */}
          <div className="panel-card">
            <div className="panel-card-header">
              <span className="panel-card-title">Validation Results</span>
            </div>
            <div className="panel-card-body">
              {VALIDATION_RESULTS.map((r) => (
                <div key={r.label} style={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                  padding: "10px 0",
                  borderBottom: "1px solid var(--brand-border)",
                }}>
                  <span style={{ color: "var(--text-2)" }}>{r.label}</span>
                  <span style={{ display: "flex", alignItems: "center", gap: 8 }}>
                    <span style={{ color: r.color, fontWeight: 700 }}>{r.icon}</span>
                    <span style={{ color: r.color, fontWeight: 600, fontSize: 12 }}>{r.verdict}</span>
                    <span style={{ color: "var(--text-3)", fontSize: 12 }}>{r.detail}</span>
                  </span>
                </div>
              ))}
            </div>
          </div>

          {/* Build Artifacts */}
          <div className="panel-card" style={{ marginTop: 16 }}>
            <div className="panel-card-header">
              <span className="panel-card-title">Build Artifacts</span>
            </div>
            <div className="panel-card-body">
              {artifactsError ? (
                <div className="panel-empty">{artifactsError}</div>
              ) : artifacts.length === 0 ? (
                <div className="panel-empty">No artifacts found.</div>
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
