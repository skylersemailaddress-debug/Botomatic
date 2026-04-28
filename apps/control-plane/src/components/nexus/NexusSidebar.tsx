import Link from "next/link";
import { NexusMode, NexusNavItem } from "./types";

const SHARED_NAV: NexusNavItem[] = [
  { label: "Projects", slug: "projects" },
  { label: "Templates", slug: "templates" },
  { label: "Design Studio", slug: "design-studio" },
  { label: "Brand Kit", slug: "brand-kit" },
  { label: "Launch", slug: "launch" },
  { label: "Learn", slug: "learn" },
  { label: "Settings", slug: "settings" },
];

const PRO_NAV: NexusNavItem[] = [
  { label: "Code", slug: "code", proOnly: true },
  { label: "Database", slug: "database", proOnly: true },
  { label: "API", slug: "api", proOnly: true },
  { label: "Tests", slug: "tests", proOnly: true },
  { label: "Runtime", slug: "runtime", proOnly: true },
  { label: "Deployments", slug: "deployments", proOnly: true },
  { label: "Audit Log", slug: "audit-log", proOnly: true },
  { label: "Integrations", slug: "integrations", proOnly: true },
  { label: "Secrets/Vault", slug: "secrets", proOnly: true },
];

export default function NexusSidebar({
  mode,
  showProNav,
  onShowPro,
  projectId,
  onPrimaryAction,
}: {
  mode: NexusMode;
  showProNav: boolean;
  onShowPro: () => void;
  projectId: string;
  onPrimaryAction: () => void;
}) {
  return (
    <aside className="nexus-sidebar">
      <div className="nexus-brand">Botomatic <span>NEXUS</span></div>
      <button className="nexus-primary" onClick={onPrimaryAction}>+ New Project</button>
      <nav className="nexus-nav">
        {SHARED_NAV.map((item) => <Link key={item.label} href={`/projects/${projectId}/${item.slug}`}>{item.label}</Link>)}
        {(mode === "pro" || showProNav) && PRO_NAV.map((item) => <Link key={item.label} href={`/projects/${projectId}/${item.slug}`}>{item.label}</Link>)}
      </nav>
      {mode === "vibe" && !showProNav && (
        <div className="nexus-card">
          <h4>Go Pro Anytime</h4>
          <p>Unlock advanced controls, runtime logs, and deployment rails.</p>
          <button className="nexus-primary" onClick={onShowPro}>Upgrade to Pro</button>
          <Link href={`/projects/${projectId}/advanced`} className="nexus-link-btn">Switch to Pro Mode</Link>
        </div>
      )}
    </aside>
  );
}
