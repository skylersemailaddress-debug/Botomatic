"use client";
import { AppShell } from "@/components/shell/AppShell";

const TOOLS = [
  { name: "Color Palette",    icon: "🎨", desc: "Generate brand-consistent color schemes" },
  { name: "Typography",       icon: "✦",  desc: "Pair fonts and set type scales" },
  { name: "Component Library",icon: "⊞",  desc: "Browse and edit UI components" },
  { name: "Layout Builder",   icon: "▦",  desc: "Drag-and-drop page sections" },
  { name: "Icon Set",         icon: "◈",  desc: "Search 10,000+ icons" },
  { name: "Animation",        icon: "◎",  desc: "Add micro-interactions and transitions" },
];

export default function DesignStudioPage() {
  return (
    <AppShell>
      <div className="page-wrap">
        <div className="page-topbar">
          <div className="page-topbar-left">
            <div className="page-eyebrow">Design Studio</div>
            <h2>Design Studio</h2>
            <p>Visual tools to craft your app's look and feel.</p>
          </div>
        </div>
        <div className="page-body">
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(260px, 1fr))", gap: 14 }}>
            {TOOLS.map((t) => (
              <div key={t.name} className="panel-card" style={{ cursor: "pointer", transition: "box-shadow .15s" }}>
                <div className="panel-card-body" style={{ display: "flex", alignItems: "center", gap: 14 }}>
                  <div style={{ width: 40, height: 40, borderRadius: 10, background: "var(--brand-soft)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 20, flexShrink: 0 }}>{t.icon}</div>
                  <div>
                    <div style={{ fontSize: 14, fontWeight: 700, color: "var(--text-1)" }}>{t.name}</div>
                    <div style={{ fontSize: 12, color: "var(--text-3)", marginTop: 2 }}>{t.desc}</div>
                  </div>
                </div>
              </div>
            ))}
          </div>
          <div className="panel-card" style={{ marginTop: 8 }}>
            <div className="panel-card-header"><span className="panel-card-title">✦ AI Design Assistant</span></div>
            <div className="panel-card-body">
              <p style={{ fontSize: 13, color: "var(--text-2)", marginBottom: 12 }}>Describe the look you want and Botomatic will generate a full design system for your project.</p>
              <div style={{ fontSize: 12, color: "var(--text-3)" }}>Use the chat bar below to get started.</div>
            </div>
          </div>
        </div>
      </div>
    </AppShell>
  );
}
