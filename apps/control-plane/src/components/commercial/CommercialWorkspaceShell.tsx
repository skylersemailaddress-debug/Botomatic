"use client";

import Link from "next/link";
import type { ReactNode } from "react";

interface CommercialWorkspaceShellProps {
  projectId: string;
  children: ReactNode;
}

const nav = ["Home", "Projects", "Templates", "Design Studio", "Brand Kit", "Launch", "Learn"];

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
          {nav.map((item) => (
            <Link key={item} href={item === "Home" ? "/" : "/projects/new"} className={item === "Home" ? "is-active" : ""}>
              <span>{item.slice(0, 1)}</span>
              <strong>{item}</strong>
            </Link>
          ))}
        </nav>

        <section className="commercial-recent" aria-label="Recent projects">
          <small>RECENT PROJECTS</small>
          <div className="commercial-recent-card">
            <strong>Project {projectId.slice(-6)}</strong>
            <span>Current workspace</span>
          </div>
          <Link href="/projects/new">View all projects →</Link>
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
