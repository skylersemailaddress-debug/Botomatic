import ProjectWorkspaceShell from "@/components/project/ProjectWorkspaceShell";
import SecretsCredentialsPanel from "@/components/overview/SecretsCredentialsPanel";

export default async function ProjectVaultPage({ params }: { params: { projectId: string } }) {
  const projectId = params.projectId;

  return (
    <ProjectWorkspaceShell projectId={projectId} mode="vault">
      <header className="northstar-workspace-topbar">
        <div>
          <div className="northstar-eyebrow">Vault</div>
          <h2>Vault</h2>
          <p>Manage secrets and credentials.</p>
        </div>
      </header>
      <div className="northstar-content-grid">
        <main className="northstar-content">
          <section className="detail-page-grid">
            <SecretsCredentialsPanel projectId={projectId} />
          </section>
        </main>
      </div>
    </ProjectWorkspaceShell>
  );
}
