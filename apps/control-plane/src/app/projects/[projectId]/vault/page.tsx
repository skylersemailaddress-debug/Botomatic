import { AppShell } from "@/components/shell/AppShell";
import SecretsCredentialsPanel from "@/components/overview/SecretsCredentialsPanel";

export default async function ProjectVaultPage({ params }: { params: { projectId: string } }) {
  const projectId = params.projectId;

  return (
    <AppShell projectId={projectId}>
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
    </AppShell>
  );
}
