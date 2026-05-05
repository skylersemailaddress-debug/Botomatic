import { AppShell } from "@/components/shell/AppShell";
import GatePanel from "@/components/overview/GatePanel";
import SecurityCenterPanel from "@/components/overview/SecurityCenterPanel";
import LaunchReadinessPanel from "@/components/overview/LaunchReadinessPanel";

export default async function ProjectSettingsPage({ params }: { params: { projectId: string } }) {
  const projectId = params.projectId;

  return (
    <AppShell projectId={projectId}>
      <header className="northstar-workspace-topbar">
        <div>
          <div className="northstar-eyebrow">Settings</div>
          <h2>Project Settings</h2>
          <p>Configure project options, gates, and security.</p>
        </div>
      </header>
      <div className="northstar-content-grid">
        <main className="northstar-content">
          <section className="detail-page-grid">
            <GatePanel projectId={projectId} />
            <LaunchReadinessPanel projectId={projectId} />
            <SecurityCenterPanel projectId={projectId} />
          </section>
        </main>
      </div>
    </AppShell>
  );
}
