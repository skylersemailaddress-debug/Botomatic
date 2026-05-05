"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import type { ReactNode } from "react";

type ProjectWorkspaceMode = "vibe" | "pro" | "settings" | "deployment" | "evidence" | "logs" | "vault" | "onboarding" | "validators";

interface ProjectWorkspaceShellProps {
  projectId: string;
  mode: ProjectWorkspaceMode;
  children: ReactNode;
}

interface ProductNavItem {
  label: string;
  href: string;
  icon: string;
  testId?: string;
}

const productNav: ProductNavItem[] = [
  { label: "Home", href: "/", testId: "nav-home", icon: "⌂" },
  { label: "Projects", href: "/intake", testId: "nav-projects", icon: "▤" },
  { label: "Templates", href: "/intake?template=1", testId: "nav-templates", icon: "⊞" },
  { label: "Design Studio", href: "/intake?studio=design", testId: "nav-design-studio", icon: "✦" },
  { label: "Brand Kit", href: "/intake?brand=kit", testId: "nav-brand-kit", icon: "◈" },
  { label: "Launch", href: "/intake?launch=1", testId: "nav-launch", icon: "▲" },
  { label: "Learn", href: "/intake?learn=1", testId: "nav-learn", icon: "◎" },
];

function getWorkspaceVariant(mode: ProjectWorkspaceMode): "vibe" | "pro" {
  return mode === "vibe" ? "vibe" : "pro";
}

function getProjectLabel(projectId: string): string {
  return projectId ? `Project ${projectId.slice(-6)}` : "Current Project";
}

export default function ProjectWorkspaceShell({ projectId, mode, children }: ProjectWorkspaceShellProps) {
  const pathname = usePathname();
  const workspaceVariant = getWorkspaceVariant(mode);
  const projectLabel = getProjectLabel(projectId);

  return (
    <section className={`project-workspace-shell project-workspace-shell--${workspaceVariant}`} data-project-id={projectId} data-workspace-mode={mode} aria-label="Project workspace">
      <aside className="project-workspace-sidebar" aria-label="Product navigation" data-testid="commercial-product-sidebar">
        <Link href="/" className="northstar-brand" aria-label="Botomatic home">
          <span className="northstar-brand-mark">B</span>
          <span><strong>Botomatic</strong><small>NEXUS</small></span>
        </Link>
        <Link href="/projects/new" className="northstar-new-project" data-testid="new-project-action">+ New Project</Link>
        <nav className="northstar-nav northstar-product-nav" aria-label="Main product navigation">
          {productNav.map((item) => (
            <Link key={item.label} href={item.href} className={item.label === "Home" && pathname?.startsWith(`/projects/${projectId}`) ? "is-active" : ""} data-testid={item.testId}>
              <span className="northstar-nav-icon" aria-hidden="true">{item.icon}</span><strong>{item.label}</strong>
            </Link>
          ))}
        </nav>
        <section className="project-workspace-recent" aria-label="Recent projects" data-testid="recent-projects-block">
          <small className="project-workspace-sidebar-eyebrow">Recent Projects</small>
          <div className="project-workspace-recent-empty"><strong>{projectLabel}</strong><span>Current workspace</span></div>
          <Link href="/projects/new">View all projects</Link>
        </section>
        <section className="project-workspace-upgrade-card" data-testid="go-pro-card">
          <strong>Go Pro Anytime</strong><p>Unlock advanced features, team collaboration, and priority support.</p><button type="button">Upgrade to Pro</button>
        </section>
        <section className="project-workspace-account" aria-label="Account" data-testid="account-strip">
          <div className="project-workspace-avatar" aria-hidden="true">B</div><div><strong>Botomatic User</strong><small>Signed in workspace</small></div>
        </section>
      </aside>
      <main className="project-workspace-main">{children}</main>
    </section>
  );
}
