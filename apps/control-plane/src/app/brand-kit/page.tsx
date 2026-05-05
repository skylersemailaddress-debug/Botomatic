"use client";
import { AppShell } from "@/components/shell/AppShell";

export default function BrandKitPage() {
  return (
    <AppShell>
      <div className="page-wrap">
        <div className="page-topbar">
          <div className="page-topbar-left">
            <div className="page-eyebrow">Brand Kit</div>
            <h2>Brand Kit</h2>
            <p>Your logo, colors, fonts and brand assets in one place.</p>
          </div>
          <div className="page-topbar-actions">
            <button type="button" className="btn btn--primary">Upload Logo</button>
          </div>
        </div>
        <div className="page-body">
          <div className="panel-card">
            <div className="panel-card-header"><span className="panel-card-title">🎨 Colors</span></div>
            <div className="panel-card-body">
              <div style={{ display: "flex", gap: 12, flexWrap: "wrap" }}>
                {[["Primary","#5b2be0"],["Secondary","#7c3aed"],["Accent","#22c55e"],["Background","#f5f3ff"],["Text","#1a0a3d"]].map(([name, hex]) => (
                  <div key={name} style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 6 }}>
                    <div style={{ width: 52, height: 52, borderRadius: 12, background: hex, border: "1px solid rgba(0,0,0,.08)" }} />
                    <span style={{ fontSize: 11, color: "var(--text-2)", fontWeight: 600 }}>{name}</span>
                    <span style={{ fontSize: 10, color: "var(--text-3)", fontFamily: "monospace" }}>{hex}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
          <div className="panel-card">
            <div className="panel-card-header"><span className="panel-card-title">✦ Typography</span></div>
            <div className="panel-card-body" style={{ display: "flex", flexDirection: "column", gap: 10 }}>
              {[["Heading","700","28px"],["Subheading","600","20px"],["Body","400","14px"],["Caption","500","11px"]].map(([role, weight, size]) => (
                <div key={role} style={{ display: "flex", alignItems: "baseline", gap: 12 }}>
                  <span style={{ width: 90, fontSize: 11, color: "var(--text-3)", fontWeight: 600, textTransform: "uppercase", letterSpacing: ".06em" }}>{role}</span>
                  <span style={{ fontSize: size as string, fontWeight: weight as string, color: "var(--text-1)" }}>The quick brown fox</span>
                </div>
              ))}
            </div>
          </div>
          <div className="panel-card">
            <div className="panel-card-header"><span className="panel-card-title">◈ Logo</span></div>
            <div className="panel-card-body">
              <div style={{ display: "flex", alignItems: "center", justifyContent: "center", height: 100, border: "2px dashed rgba(91,43,224,.2)", borderRadius: 12, color: "var(--text-3)", fontSize: 13 }}>
                No logo uploaded yet — click "Upload Logo" to add one
              </div>
            </div>
          </div>
        </div>
      </div>
    </AppShell>
  );
}
