"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import type { ReactNode } from "react";

const NAV_TOP = [
  { label: "Home",          href: "/projects/new",              icon: "⌂" },
  { label: "Templates",     href: "/projects/new?t=1",          icon: "⊞" },
  { label: "Design Studio", href: "/projects/new?s=design",     icon: "✦" },
  { label: "Brand Kit",     href: "/projects/new?s=brand",      icon: "◈" },
  { label: "Learn",         href: "/projects/new?s=learn",      icon: "◎" },
];

function projectNav(projectId: string) {
  return [
    { label: "Vibe Builder",  href: `/projects/${projectId}`,             icon: "✦" },
    { label: "Deployment",    href: `/projects/${projectId}/deployment`,   icon: "▲" },
    { label: "Logs",          href: `/projects/${projectId}/logs`,         icon: "📋" },
    { label: "Evidence",      href: `/projects/${projectId}/evidence`,     icon: "🔍" },
    { label: "Validators",    href: `/projects/${projectId}/validators`,   icon: "✓" },
    { label: "Vault",         href: `/projects/${projectId}/vault`,        icon: "🔐" },
    { label: "Settings",      href: `/projects/${projectId}/settings`,     icon: "⚙" },
    { label: "Pro Cockpit",   href: `/projects/${projectId}/advanced`,     icon: "⌥" },
  ];
}

const RECENT_PLACEHOLDER = [
  { label: "Luxury Booking Site", color: "#22c55e", time: "Just now" },
  { label: "SaaS Dashboard",      color: "#f59e0b", time: "2h ago" },
  { label: "AI Landing Page",     color: "#6366f1", time: "1d ago" },
];

interface AppShellProps {
  children: ReactNode;
  projectId?: string;
}

export function AppShell({ children, projectId }: AppShellProps) {
  const pathname = usePathname();
  const navItems = projectId ? projectNav(projectId) : NAV_TOP;

  return (
    <div className="app-shell">
      <aside className="app-sidebar" aria-label="Botomatic navigation">
        {/* Brand */}
        <Link href="/projects/new" className="sidebar-brand" aria-label="Botomatic home">
          <span className="sidebar-brand-mark">B</span>
          <span className="sidebar-brand-name">
            <strong>Botomatic</strong>
            <small>NEXUS</small>
          </span>
        </Link>

        <Link href="/projects/new" className="sidebar-new-project">
          + New Project
        </Link>

        <nav className="sidebar-nav" aria-label={projectId ? "Project navigation" : "Product navigation"}>
          {navItems.map((item) => {
            const isActive = pathname === item.href || (item.href !== "/projects/new" && pathname.startsWith(item.href));
            return (
              <Link
                key={item.label}
                href={item.href}
                className={`sidebar-nav-item${isActive ? " active" : ""}`}
              >
                <span className="sidebar-nav-icon" aria-hidden="true">{item.icon}</span>
                {item.label}
              </Link>
            );
          })}
        </nav>

        <div className="sidebar-divider" />

        {!projectId && (
          <>
            <span className="sidebar-section-label">Recent Projects</span>
            <div className="sidebar-recent">
              {RECENT_PLACEHOLDER.map((p) => (
                <div key={p.label} className="sidebar-recent-item">
                  <span className="sidebar-recent-dot" style={{ background: p.color }} />
                  <span className="sidebar-recent-name">{p.label}</span>
                  <span className="sidebar-recent-time">{p.time}</span>
                </div>
              ))}
              <Link href="/projects/new" className="sidebar-view-all">View all projects →</Link>
            </div>
            <div className="sidebar-divider" />
          </>
        )}

        <div className="sidebar-upgrade">
          <strong>🚀 Go Pro Anytime</strong>
          <p>Unlock advanced features, team collaboration, and priority support.</p>
          <button type="button" className="sidebar-upgrade-btn">Upgrade to Pro</button>
        </div>

        <div className="sidebar-account">
          <div className="sidebar-avatar">B</div>
          <div className="sidebar-account-info">
            <strong>Botomatic User</strong>
            <small>Signed in workspace</small>
          </div>
        </div>
      </aside>

      <main className="app-main">{children}</main>
    </div>
  );
}

export default AppShell;
