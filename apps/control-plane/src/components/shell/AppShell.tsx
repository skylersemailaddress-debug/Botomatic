"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import type { ReactNode } from "react";

const NAV = [
  { label: "Home",      href: "/",           icon: "⌂" },
  { label: "Projects",  href: "/projects",   icon: "▤" },
];

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

  return (
    <div className="app-shell">
      <aside className="app-sidebar" aria-label="Botomatic navigation">
        <Link href="/" className="sidebar-brand" aria-label="Botomatic home">
          <span className="sidebar-brand-mark">B</span>
          <span className="sidebar-brand-name">
            <strong>Botomatic</strong>
            <small>NEXUS</small>
          </span>
        </Link>

        <Link href="/" className="sidebar-new-project">
          + New build
        </Link>

        <nav className="sidebar-nav" aria-label="Product navigation">
          {NAV.map((item) => (
            <Link
              key={item.label}
              href={item.href}
              className={`sidebar-nav-item${pathname === item.href ? " active" : ""}`}
            >
              <span className="sidebar-nav-icon" aria-hidden="true">{item.icon}</span>
              {item.label}
            </Link>
          ))}
        </nav>

        <div className="sidebar-divider" />

        <span className="sidebar-section-label">Recent Projects</span>
        <div className="sidebar-recent">
          {RECENT_PLACEHOLDER.map((p) => (
            <div key={p.label} className="sidebar-recent-item">
              <span className="sidebar-recent-dot" style={{ background: p.color }} />
              <span className="sidebar-recent-name">{p.label}</span>
              <span className="sidebar-recent-time">{p.time}</span>
            </div>
          ))}
          <Link href="/" className="sidebar-view-all">Go to Beta HQ →</Link>
        </div>

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
