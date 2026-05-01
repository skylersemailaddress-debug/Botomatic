import ProjectWorkspaceShell from "@/components/project/ProjectWorkspaceShell";
import AuditPanel from "@/components/overview/AuditPanel";
import DeploymentHistoryPanel from "@/components/overview/DeploymentHistoryPanel";
import AutonomousBuildRunPanel from "@/components/overview/AutonomousBuildRunPanel";

export default async function ProjectLogsPage({ params }: { params: { projectId: string } }) {
  const projectId = params.projectId;

  return (
    <ProjectWorkspaceShell projectId={projectId} mode="logs">
      <header className="northstar-workspace-topbar">
        <div>
          <div className="northstar-eyebrow">Logs</div>
          <h2>Logs</h2>
          <p>View build runs, audit logs, and deployment history.</p>
        </div>
      </header>
      <div className="northstar-content-grid">
        <main className="northstar-content">
          <section className="detail-page-grid">
            <AutonomousBuildRunPanel projectId={projectId} />
            <AuditPanel projectId={projectId} />
            <DeploymentHistoryPanel projectId={projectId} />
          </section>
        </main>
      </div>
    </ProjectWorkspaceShell>
  );
}
