"use client";
import { AppShell } from "@/components/shell/AppShell";

const TEMPLATES = [
  { name: "SaaS Dashboard",      desc: "Auth, billing, analytics",        icon: "📊", color: "#6366f1" },
  { name: "E-commerce Store",    desc: "Products, cart, checkout",         icon: "🛍", color: "#f59e0b" },
  { name: "Landing Page",        desc: "Hero, features, CTA",              icon: "🚀", color: "#22c55e" },
  { name: "Portfolio",           desc: "Case studies, contact",            icon: "🎨", color: "#ec4899" },
  { name: "Booking System",      desc: "Calendar, reservations, payments", icon: "📅", color: "#14b8a6" },
  { name: "AI Platform",         desc: "Prompts, chat UI, dashboards",     icon: "🤖", color: "#8b5cf6" },
  { name: "Blog & CMS",          desc: "Posts, authors, categories",       icon: "📝", color: "#f97316" },
  { name: "Admin Panel",         desc: "CRUD, roles, audit logs",          icon: "⚙️", color: "#64748b" },
];

export default function TemplatesPage() {
  return (
    <AppShell>
      <div className="page-wrap">
        <div className="page-topbar">
          <div className="page-topbar-left">
            <div className="page-eyebrow">Templates</div>
            <h2>Start from a template</h2>
            <p>Pick a starting point — Botomatic will scaffold and customise it for you.</p>
          </div>
        </div>
        <div className="page-body">
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(240px, 1fr))", gap: 16 }}>
            {TEMPLATES.map((t) => (
              <button key={t.name} type="button" style={{
                display: "flex", flexDirection: "column", alignItems: "flex-start", gap: 10,
                padding: 20, borderRadius: 14, border: "1.5px solid rgba(91,43,224,.12)",
                background: "#fff", cursor: "pointer", textAlign: "left", transition: "all .15s",
              }}
                onMouseEnter={(e) => { (e.currentTarget as HTMLButtonElement).style.borderColor = t.color; (e.currentTarget as HTMLButtonElement).style.transform = "translateY(-2px)"; }}
                onMouseLeave={(e) => { (e.currentTarget as HTMLButtonElement).style.borderColor = "rgba(91,43,224,.12)"; (e.currentTarget as HTMLButtonElement).style.transform = "none"; }}
              >
                <div style={{ width: 44, height: 44, borderRadius: 12, background: `${t.color}18`, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 22 }}>{t.icon}</div>
                <div>
                  <div style={{ fontSize: 14, fontWeight: 700, color: "var(--text-1)", marginBottom: 3 }}>{t.name}</div>
                  <div style={{ fontSize: 12, color: "var(--text-3)" }}>{t.desc}</div>
                </div>
                <div style={{ marginTop: "auto", fontSize: 12, fontWeight: 600, color: t.color }}>Use template →</div>
              </button>
            ))}
          </div>
        </div>
      </div>
    </AppShell>
  );
}
