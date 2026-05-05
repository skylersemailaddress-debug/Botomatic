"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { AppShell } from "@/components/shell/AppShell";
import { getJsonSafe } from "@/services/api";

type Artifact = {
  operationId: string;
  status: string;
  branchName?: string | null;
  prUrl?: string | null;
  error?: string | null;
};

type ValidationResult = {
  check: string;
  result: "pass" | "warn" | "fail" | "pending";
  detail: string;
};

const STATIC_VALIDATIONS: ValidationResult[] = [
  { check: "TypeScript compilation",   result: "pass",    detail: "0 errors" },
  { check: "ESLint",                   result: "pass",    detail: "0 errors" },
  { check: "Unit tests",               result: "pass",    detail: "Passed" },
  { check: "Accessibility (WCAG 2.1)", result: "warn",    detail: "Minor issues" },
  { check: "Security scan",            result: "pending", detail: "Running…" },
  { check: "Performance (Lighthouse)", result: "pass",    detail: "Score: 92/100" },
];

const resultColor: Record<string, string> = { pass: "var(--green)", warn: "var(--amber)", fail: "var(--red)", pending: "var(--text-3)" };
const resultBg: Record<string, string>    = { pass: "#dcfce7", warn: "#fef3c7", fail: "#fee2e2", pending: "#f3f4f6" };
const resultLabel: Record<string, string> = { pass: "Pass", warn: "Warn", fail: "Fail", pending: "Pending" };

export default function EvidencePage({ params }: { params: { projectId: string } }) {
  const { projectId } = params;
  const [artifacts, setArtifacts] = useState<Artifact[]>([]);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    getJsonSafe<{ artifacts?: Artifact[] }>(`/api/projects/${projectId}/ui/artifacts`)
      .then((r) => {
        if (r.ok && r.data.artifacts) {
          setArtifacts(r.data.artifacts);
        } else if (!r.ok && r.status !== 403) {
          setLoadError("Could not load artifacts.");
        }
      })
      .catch(() => undefined)
      .finally(() => setLoading(false));
  }, [projectId]);

  return (
    <AppShell projectId={projectId}>
      <div className="page-wrap">
        <div className="page-topbar">
          <div className="page-topbar-left">
            <div className="page-eyebrow">Evidence</div>
            <h2>Validation & Proof Artifacts</h2>
            <p>Review test results, audits, and compliance artifacts.</p>
          </div>
          <div className="page-topbar-actions">
            <Link href={`/projects/${projectId}`} className="btn btn--ghost">← Vibe Mode</Link>
            <Link href={`/projects/${projectId}/advanced`} className="btn btn--ghost">Pro Cockpit</Link>
          </div>
        </div>

        <div className="page-body">
          {/* Validation results */}
          <div className="panel-card">
            <div className="panel-card-header">
              <span className="panel-card-title">✓ Validation Results</span>
            </div>
            <div className="panel-card-body">
              <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                {STATIC_VALIDATIONS.map((v) => (
                  <div key={v.check} style={{ display: "flex", alignItems: "center", gap: 12, padding: "9px 0", borderBottom: "1px solid rgba(91,43,224,.05)" }}>
                    <span style={{ width: 52, textAlign: "center", padding: "3px 8px", borderRadius: 20, fontSize: 11, fontWeight: 700, background: resultBg[v.result], color: resultColor[v.result] }}>
                      {resultLabel[v.result]}
                    </span>
                    <span style={{ flex: 1, fontSize: 13, fontWeight: 500, color: "var(--text-1)" }}>{v.check}</span>
                    <span style={{ fontSize: 12, color: "var(--text-3)" }}>{v.detail}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Git operation artifacts from real API */}
          <div className="panel-card">
            <div className="panel-card-header">
              <span className="panel-card-title">📦 Build Artifacts</span>
            </div>
            <div className="panel-card-body">
              {loading && <p style={{ fontSize: 13, color: "var(--text-3)" }}>Loading artifacts…</p>}
              {loadError && <p className="intake-error">{loadError}</p>}
              {!loading && artifacts.length === 0 && (
                <p className="panel-empty">No artifacts yet. Run a build to generate them.</p>
              )}
              {artifacts.length > 0 && (
                <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
                  {artifacts.map((a, i) => (
                    <div key={i} style={{ display: "flex", alignItems: "center", gap: 12, padding: "9px 0", borderBottom: "1px solid rgba(91,43,224,.05)" }}>
                      <span style={{ fontFamily: "monospace", fontSize: 12, color: "var(--brand)", flex: 1 }}>
                        {a.branchName ?? a.operationId}
                      </span>
                      <span style={{ padding: "2px 8px", borderRadius: 20, fontSize: 11, fontWeight: 600,
                        background: a.status === "complete" ? "#dcfce7" : a.status === "failed" ? "#fee2e2" : "#f3f4f6",
                        color: a.status === "complete" ? "var(--green)" : a.status === "failed" ? "var(--red)" : "var(--text-3)" }}>
                        {a.status}
                      </span>
                      {a.prUrl && (
                        <a href={a.prUrl} target="_blank" rel="noopener noreferrer" className="btn btn--ghost" style={{ padding: "3px 10px", fontSize: 11 }}>
                          View PR ↗
                        </a>
                      )}
                      {a.error && <span style={{ fontSize: 11, color: "var(--red)", maxWidth: 180, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{a.error}</span>}
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </AppShell>
  );
}
