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

interface NavItem {
  label: string;
  href: string;
  testId?: string;
}

interface RecentProject {
  id: string;
  label: string;
  updated: string;
}

function getWorkspaceVariant(mode: ProjectWorkspaceMode): "vibe" | "pro" {
  return mode === "vibe" ? "vibe" : "pro";
}

function getProjectNavigation(projectId: string): NavItem[] {
  return [
    { label: "Vibe", href: `/projects/${projectId}`, testId: "nav-vibe" },
    { label: "Advanced", href: `/projects/${projectId}/advanced`, testId: "nav-advanced" },
    { label: "Settings", href: `/projects/${projectId}/settings`, testId: "nav-settings" },
    { label: "Deployment", href: `/projects/${projectId}/deployment`, testId: "nav-deployment" },
    { label: "Evidence", href: `/projects/${projectId}/evidence`, testId: "nav-evidence" },
    { label: "Logs", href: `/projects/${projectId}/logs`, testId: "nav-logs" },
    { label: "Vault", href: `/projects/${projectId}/vault`, testId: "nav-vault" },
    { label: "Onboarding", href: `/projects/${projectId}/onboarding`, testId: "nav-onboarding" },
    { label: "Validators", href: `/projects/${projectId}/validators`, testId: "nav-validators" },
  ];
}

function getRecentProjects(projectId: string): RecentProject[] {
  return [
    { id: projectId, label: `Project ${projectId}`, updated: "Active now" },
    { id: `${projectId}-beta`, label: "Marketing Site", updated: "2h ago" },
    { id: `${projectId}-ops`, label: "Ops Console", updated: "Yesterday" },
  ];
}

function isNavItemActive(href: string, pathname: string, mode: ProjectWorkspaceMode): boolean {
  if (!pathname) return false;
  // Special case: /projects/:id and /projects/:id/vibe should both show vibe as active.
  if (mode === "vibe" && (pathname === href || pathname.endsWith("/vibe"))) {
    return true;
  }
  return pathname === href;
}

export default function ProjectWorkspaceShell({
  projectId,
  mode,
  children,
}: ProjectWorkspaceShellProps) {
  const pathname = usePathname();
  const navItems = getProjectNavigation(projectId);
  const recentProjects = getRecentProjects(projectId);
  const workspaceVariant = getWorkspaceVariant(mode);

  return (
    <section
      className={`northstar-shell project-workspace-shell project-workspace-shell--${workspaceVariant}`}
      data-project-id={projectId}
      data-workspace-mode={mode}
      aria-label="Project workspace"
    >
      <aside className="northstar-global-sidebar northstar-sidebar project-workspace-sidebar" aria-label="Project navigation" data-testid="project-workspace-sidebar">
        <Link href="/" className="northstar-brand" aria-label="Botomatic home">
          <span className="northstar-brand-mark">⬢</span>
          <span>
            <strong>Botomatic</strong>
            <small>NEXUS</small>
          </span>
        </Link>

        <Link href="/projects/new" className="northstar-new-project">
          + New Project
        </Link>

        <nav className="northstar-nav" aria-label="Project navigation">
          {navItems.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className={isNavItemActive(item.href, pathname, mode) ? "is-active" : ""}
              data-testid={item.testId}
            >
              {item.label}
            </Link>
          ))}
        </nav>

        <section className="project-workspace-sidebar-card" aria-label="Recent projects" data-testid="project-workspace-recent-projects">
          <small className="project-workspace-sidebar-eyebrow">Recent projects</small>
          <div className="project-workspace-recent-list">
            {recentProjects.map((item) => (
              <Link key={item.id} href={`/projects/${item.id}`} className="project-workspace-recent-item">
                <strong>{item.label}</strong>
                <small>{item.updated}</small>
              </Link>
            ))}
          </div>
        </section>

        <div className="project-workspace-sidebar-card" data-testid="project-workspace-identity-card">
          <small className="project-workspace-sidebar-eyebrow">Commercial workspace</small>
          <strong>Project {projectId}</strong>
          <p>Shared premium shell for Vibe, Advanced, and all project routes.</p>
        </div>

        <section className="project-workspace-sidebar-card" aria-label="Go Pro plan" data-testid="project-workspace-go-pro">
          <small className="project-workspace-sidebar-eyebrow">Go Pro</small>
          <strong>Unlock CI + deployment controls</strong>
          <p>Activate Advanced controls for branch gating, deployment approvals, and launch checks.</p>
          <button
            type="button"
            className="northstar-primary-button"
            disabled
            aria-label="Upgrade unavailable in local beta"
            title="Billing and plan upgrades are not connected in local beta mode"
          >
            Upgrade unavailable
          </button>
          <small>Billing flow is not connected in local beta mode.</small>
        </section>

        <div className="project-workspace-account-strip" data-testid="project-workspace-account-strip">
          <span className="project-workspace-account-avatar" aria-hidden="true">SK</span>
          <div>
            <strong>Skyler Admin</strong>
            <small>Owner account</small>
          </div>
          <button
            type="button"
            className="northstar-ghost-action"
            disabled
            aria-label="Manage unavailable"
            title="Account management is controlled from enterprise identity settings"
          >
            Manage unavailable
          </button>
        </div>

        <div className="northstar-sidebar-note project-workspace-sidebar-note">
          <div>{workspaceVariant === "vibe" ? "Vibe reference shell" : "Pro reference shell"}</div>
          <small>Commercial navigation stays consistent across every project page.</small>
        </div>
      </aside>

      <div className="northstar-main project-workspace-main">
        {children}
      </div>
    </section>
  );
}
