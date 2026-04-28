"use client";

import Link from "next/link";
import type { WorkspaceView } from "./workspaceView";

type WorkspaceMode = "vibe" | "pro";

export default function ProductionPageShell({
  projectId,
  mode,
  view,
  children,
}: {
  projectId: string;
  mode: WorkspaceMode;
  view: WorkspaceView;
  children: React.ReactNode;
}) {
  const baseHref = mode === "vibe" ? `/projects/${projectId}/vibe` : `/projects/${projectId}/advanced`;
  const contextualHref = mode === "vibe" ? `/projects/${projectId}/advanced?view=${view}` : `/projects/${projectId}`;
  const contextualLabel = mode === "vibe" ? "Advanced controls" : "Chat workspace";

  return (
    <section className="production-page-shell">
      <aside className="nexus-sidebar" aria-label="Workspace sections">
        <div className="nexus-sidebar-title">Workspace</div>
        <Link href={`${baseHref}?view=overview`} className={`nexus-sidebar-link ${view === "overview" ? "is-active" : ""}`}>
          Overview
        </Link>
        <Link href={`${baseHref}?view=activity`} className={`nexus-sidebar-link ${view === "activity" ? "is-active" : ""}`}>
          Activity
        </Link>
        <Link href={`${baseHref}?view=quality`} className={`nexus-sidebar-link ${view === "quality" ? "is-active" : ""}`}>
          Quality
        </Link>
      </aside>

      <div className="nexus-preview">
        <header className="workspace-topbar">
          <div>
            <div className="workspace-mode-label">Botomatic {mode === "vibe" ? "Vibe" : "Pro"}</div>
            <div className="workspace-subtle">Project {projectId} · {view}</div>
          </div>
          <div className="workspace-topbar-actions" role="group" aria-label="Workspace actions">
            <Link href={contextualHref} className="workspace-pill">
              {contextualLabel}
            </Link>
            <Link href="/" className="workspace-pill workspace-pill--primary">
              New Project
            </Link>
          </div>
        </header>
        {children}
      </div>
    </section>
  );
}
