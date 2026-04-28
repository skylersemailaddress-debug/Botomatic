"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import StatusBadge from "@/components/ui/StatusBadge";
import { getProjectGate } from "@/services/gate";
import { getProjectOverview } from "@/services/overview";

type ProjectTopBarProps = {
  projectId: string;
  environment: string;
};

type NavItem = {
  href: string;
  label: string;
};

export default function ProjectTopBar({ projectId, environment }: ProjectTopBarProps) {
  const pathname = usePathname();
  const [runStatus, setRunStatus] = useState("idle");
  const [gateStatus, setGateStatus] = useState("pending");

  useEffect(() => {
    let active = true;

    async function load() {
      try {
        const [overview, gate] = await Promise.all([
          getProjectOverview(projectId),
          getProjectGate(projectId),
        ]);
        if (!active) return;
        setRunStatus(overview.latestRun?.status || "idle");
        setGateStatus(gate.launchStatus || "pending");
      } catch {
        if (!active) return;
        setRunStatus("idle");
      }
    }

    void load();
    const timer = setInterval(() => {
      void load();
    }, 5000);

    return () => {
      active = false;
      clearInterval(timer);
    };
  }, [projectId]);

  const navItems = useMemo<NavItem[]>(() => [
    { href: `/projects/${projectId}`, label: "Cockpit" },
    { href: `/projects/${projectId}/settings`, label: "Settings" },
    { href: `/projects/${projectId}/vault`, label: "Vault" },
    { href: `/projects/${projectId}/evidence`, label: "Evidence" },
    { href: `/projects/${projectId}/advanced`, label: "Advanced" },
  ], [projectId]);

  return (
    <header className="topbar-shell">
      <div className="topbar-title-block">
        <div className="topbar-eyebrow">Botomatic Builder Cockpit</div>
        <div className="topbar-project-row">
          <h1 className="topbar-project-name">{projectId}</h1>
          <StatusBadge status={runStatus} />
          <StatusBadge status={gateStatus} />
        </div>
      </div>

      <nav className="topbar-nav" aria-label="Project navigation">
        {navItems.map((item) => {
          const active = pathname === item.href;
          return (
            <Link
              key={item.href}
              href={item.href}
              className={`topbar-link ${active ? "is-active" : ""}`}
            >
              {item.label}
            </Link>
          );
        })}
      </nav>

      <div className="topbar-meta">
        <div>Environment: {environment}</div>
        <Link href="/" className="topbar-link-plain">New Project</Link>
      </div>
    </header>
  );
}
