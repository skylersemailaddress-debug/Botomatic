"use client";

import Link from "next/link";
import { AppShell } from "@/components/shell/AppShell";

const ARTIFACTS = [
  { name: "build-report.json",       type: "JSON",   size: "12 KB",  status: "ready"   },
  { name: "test-results.xml",        type: "XML",    size: "8 KB",   status: "ready"   },
  { name: "lighthouse-audit.html",   type: "HTML",   size: "240 KB", status: "ready"   },
  { name: "security-scan.sarif",     type: "SARIF",  size: "4 KB",   status: "pending" },
  { name: "coverage-report.lcov",    type: "LCOV",   size: "56 KB",  status: "ready"   },
];

const VALIDATIONS = [
  { check: "TypeScript compilation",  result: "pass",    detail: "0 errors, 2 warnings" },
  { check: "ESLint",                  result: "pass",    detail: "0 errors, 5 warnings" },
  { check: "Unit tests",              result: "pass",    detail: "42 passed, 2 skipped" },
  { check: "Accessibility (WCAG 2.1)",result: "warn",    detail: "3 contrast issues found" },
  { check: "Security scan",           result: "pending", detail: "Running…" },
  { check: "Performance (Lighthouse)",result: "pass",    detail: "Score: 92/100" },
];

const resultColor: Record<string, string> = { pass: "var(--green)", warn: "var(--amber)", fail: "var(--red)", pending: "var(--text-3)" };
const resultBg: Record<string, string> = { pass: "#dcfce7", warn: "#fef3c7", fail: "#fee2e2", pending: "#f3f4f6" };
const resultLabel: Record<string, string> = { pass: "Pass", warn: "Warn", fail: "Fail", pending: "Pending" };

export default function EvidencePage({ params }: { params: { projectId: string } }) {
  const { projectId } = params;

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
                {VALIDATIONS.map((v) => (
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

          {/* Artifacts */}
          <div className="panel-card">
            <div className="panel-card-header">
              <span className="panel-card-title">📦 Artifacts</span>
            </div>
            <div className="panel-card-body">
              <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
                {ARTIFACTS.map((a) => (
                  <div key={a.name} style={{ display: "flex", alignItems: "center", gap: 12, padding: "9px 0", borderBottom: "1px solid rgba(91,43,224,.05)" }}>
                    <span style={{ fontFamily: "monospace", fontSize: 12, color: "var(--brand)", flex: 1 }}>{a.name}</span>
                    <span style={{ fontSize: 11, color: "var(--text-3)" }}>{a.type}</span>
                    <span style={{ fontSize: 11, color: "var(--text-3)" }}>{a.size}</span>
                    <span style={{ padding: "2px 8px", borderRadius: 20, fontSize: 11, fontWeight: 600,
                      background: a.status === "ready" ? "#dcfce7" : "#f3f4f6",
                      color: a.status === "ready" ? "var(--green)" : "var(--text-3)" }}>
                      {a.status}
                    </span>
                    {a.status === "ready" && (
                      <button type="button" className="btn btn--ghost" style={{ padding: "3px 10px", fontSize: 11 }}>↓ Download</button>
                    )}
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    </AppShell>
  );
}
