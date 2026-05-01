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

function isNavItemActive(href: string, pathname: string, mode: ProjectWorkspaceMode): boolean {
  // Special case: /projects/:id and /projects/:id/vibe should both show vibe as active
  if (mode === "vibe" && (pathname?.endsWith(`/projects/${href.split("/").pop()}`) || pathname?.endsWith("/vibe"))) {
    return true;
  }
  return pathname?.endsWith(href.split("/").pop() ?? "") ?? false;
}

export default function ProjectWorkspaceShell({
  projectId,
  mode,
  children,
}: ProjectWorkspaceShellProps) {
  const pathname = usePathname();
  const navItems = getProjectNavigation(projectId);

  return (
    <section
      className="northstar-shell"
      data-project-id={projectId}
      data-workspace-mode={mode}
      aria-label="Project workspace"
    >
      {/* Left Sidebar */}
      <aside className="northstar-global-sidebar" aria-label="Project navigation">
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

        <div className="northstar-sidebar-note">
          <div>Project workspace</div>
          <small>Navigate between builder modes and project settings.</small>
        </div>
      </aside>

      {/* Main Content */}
      <div className="northstar-main">
        {children}
      </div>
    </section>
  );
}
