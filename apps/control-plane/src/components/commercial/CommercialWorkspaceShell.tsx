"use client";

import Link from "next/link";
import type { ReactNode } from "react";

interface CommercialWorkspaceShellProps {
  projectId: string;
  children: ReactNode;
}

const navItems = [
  { label: "Home", href: "/", icon: "🏠" },
  { label: "Projects", href: "/projects/new", icon: "📁" },
  { label: "Templates", href: "/projects/new?template=1", icon: "📄" },
  { label: "Design Studio", href: "/projects/new?studio=design", icon: "🎨" },
  { label: "Brand Kit", href: "/projects/new?brand=kit", icon: "✦" },
  { label: "Launch", href: "/projects/new?launch=1", icon: "🚀" },
  { label: "Learn", href: "/projects/new?learn=1", icon: "📚" },
];

export function CommercialWorkspaceShell({ projectId, children }: CommercialWorkspaceShellProps) {
  return (
    <section className="commercial-shell" data-testid="commercial-shell" data-project-id={projectId}>
      <aside className="commercial-sidebar" data-testid="commercial-product-sidebar" aria-label="Botomatic navigation">
        <Link href="/" className="commercial-brand" aria-label="Botomatic home">
          <span className="commercial-brand-mark">B</span>
          <span>
            <strong>Botomatic</strong>
            <small>NEXUS</small>
          </span>
        </Link>

        <Link href="/projects/new" className="commercial-new-project">+ New Project</Link>

        <nav className="commercial-nav" aria-label="Primary navigation">
          {navItems.map((item) => (
            <Link key={item.label} href={item.href} className={item.label === "Home" ? "is-active" : ""}>
              <span aria-hidden="true" className="commercial-nav-icon">{item.icon}</span>
              <strong>{item.label}</strong>
            </Link>
          ))}
        </nav>

        <section className="commercial-recent" aria-label="Recent projects">
          <small>RECENT PROJECTS</small>
          <div className="commercial-recent-card">
            <strong>Project {projectId.slice(-6)}</strong>
            <span>Current workspace</span>
          </div>
          <Link href="/projects">View all projects →</Link>
        </section>

        <section className="commercial-upgrade-card">
          <strong>Go Pro Anytime</strong>
          <p>Unlock advanced features, team collaboration, and priority support.</p>
          <button type="button">Upgrade to Pro</button>
        </section>

        <section className="commercial-account" aria-label="Account">
          <span>B</span>
          <div>
            <strong>Botomatic User</strong>
            <small>Signed in workspace</small>
          </div>
        </section>
      </aside>

      <main className="commercial-main">{children}</main>
    </section>
  );
}
