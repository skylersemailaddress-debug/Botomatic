"use client";
import Link from "next/link";
import { AppShell } from "@/components/shell/AppShell";

const GUIDES = [
  { title: "Getting Started",         desc: "Build your first app in 5 minutes",        icon: "🚀", time: "5 min" },
  { title: "Using the Chat Bar",      desc: "How to describe changes effectively",       icon: "💬", time: "3 min" },
  { title: "Deployment Guide",        desc: "Push your app to production",               icon: "▲",  time: "8 min" },
  { title: "Custom Domains",          desc: "Connect your own domain",                   icon: "🌐", time: "5 min" },
  { title: "Environment Variables",   desc: "Manage secrets and config",                 icon: "🔐", time: "4 min" },
  { title: "GitHub Integration",      desc: "Sync code with your repository",            icon: "⌥",  time: "6 min" },
];

export default function LearnPage() {
  return (
    <AppShell>
      <div className="page-wrap">
        <div className="page-topbar">
          <div className="page-topbar-left">
            <div className="page-eyebrow">Learn</div>
            <h2>Guides & Documentation</h2>
            <p>Everything you need to get the most out of Botomatic.</p>
          </div>
        </div>
        <div className="page-body">
          <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            {GUIDES.map((g) => (
              <div key={g.title} className="panel-card" style={{ cursor: "pointer" }}>
                <div className="panel-card-body" style={{ display: "flex", alignItems: "center", gap: 14 }}>
                  <div style={{ width: 40, height: 40, borderRadius: 10, background: "var(--brand-soft)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 18, flexShrink: 0 }}>{g.icon}</div>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontSize: 14, fontWeight: 700, color: "var(--text-1)" }}>{g.title}</div>
                    <div style={{ fontSize: 12, color: "var(--text-3)", marginTop: 2 }}>{g.desc}</div>
                  </div>
                  <span style={{ fontSize: 11, color: "var(--text-3)", flexShrink: 0 }}>{g.time} read</span>
                  <span style={{ fontSize: 16, color: "var(--brand)", flexShrink: 0 }}>→</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </AppShell>
  );
}
