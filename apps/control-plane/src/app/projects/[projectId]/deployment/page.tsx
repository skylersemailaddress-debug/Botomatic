import { AppShell } from "@/components/shell/AppShell";
import DeploymentPanel from "@/components/overview/DeploymentPanel";
import DeploymentHistoryPanel from "@/components/overview/DeploymentHistoryPanel";

export default async function ProjectDeploymentPage({ params }: { params: { projectId: string } }) {
  const projectId = params.projectId;

  return (
    <AppShell projectId={projectId}>
      <header className="northstar-workspace-topbar">
        <div>
          <div className="northstar-eyebrow">Deployment</div>
          <h2>Deployment</h2>
          <p>Deploy your application to production.</p>
        </div>
      </header>
      <div className="northstar-content-grid">
        <main className="northstar-content">
          <section className="detail-page-grid">
            <DeploymentPanel projectId={projectId} />
            <DeploymentHistoryPanel projectId={projectId} />
          </section>
        </main>
      </div>
    </AppShell>
  );
}
