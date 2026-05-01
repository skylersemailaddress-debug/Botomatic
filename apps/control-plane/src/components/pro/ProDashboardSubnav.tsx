"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const SUBNAV_ROUTES: Record<string, string> = {
  Overview: "advanced",
  Tests: "validators",
  Deployments: "deployment",
  "Audit Log": "logs",
  Secrets: "vault",
  Settings: "settings",
};

export function ProDashboardSubnav({ projectId, items }: { projectId: string; items: string[] }) {
  const pathname = usePathname();

  return (
    <nav className="pro-subnav" aria-label="Pro navigation">
      {items.map((item) => {
        const subpath = SUBNAV_ROUTES[item];
        if (subpath) {
          const href = `/projects/${projectId}/${subpath}`;
          const isActive = pathname?.endsWith(`/${subpath}`) ?? false;
          return (
            <Link key={item} href={href} className={isActive ? "is-active" : ""}>
              {item}
            </Link>
          );
        }
        return (
          <button type="button" key={item} disabled aria-label={`${item} — coming soon`}>
            {item}
          </button>
        );
      })}
    </nav>
  );
}
