import AppShell from "@/components/shell/AppShell";
import AuditPanel from "@/components/overview/AuditPanel";
import DeploymentHistoryPanel from "@/components/overview/DeploymentHistoryPanel";
import AutonomousBuildRunPanel from "@/components/overview/AutonomousBuildRunPanel";

export default async function ProjectLogsPage({ params }: { params: { projectId: string } }) {
  const projectId = params.projectId;

  return (
    <AppShell projectName={projectId} environment="commercial" runStatus="idle" mode="page">
      <section className="detail-page-grid">
        <AutonomousBuildRunPanel projectId={projectId} />
        <AuditPanel projectId={projectId} />
        <DeploymentHistoryPanel projectId={projectId} />
      </section>
    </AppShell>
  );
}
