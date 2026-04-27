import AppShell from "@/components/shell/AppShell";
import DeploymentPanel from "@/components/overview/DeploymentPanel";
import DeploymentHistoryPanel from "@/components/overview/DeploymentHistoryPanel";

export default async function ProjectDeploymentPage({ params }: { params: { projectId: string } }) {
  const projectId = params.projectId;

  return (
    <AppShell projectName={projectId} environment="commercial" runStatus="idle" mode="page">
      <section className="detail-page-grid">
        <DeploymentPanel projectId={projectId} />
        <DeploymentHistoryPanel projectId={projectId} />
      </section>
    </AppShell>
  );
}
