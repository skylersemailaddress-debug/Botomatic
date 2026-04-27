import AppShell from "@/components/shell/AppShell";
import SecretsCredentialsPanel from "@/components/overview/SecretsCredentialsPanel";

export default async function ProjectVaultPage({ params }: { params: { projectId: string } }) {
  const projectId = params.projectId;

  return (
    <AppShell projectName={projectId} environment="commercial" runStatus="idle" mode="page">
      <section className="detail-page-grid">
        <SecretsCredentialsPanel projectId={projectId} />
      </section>
    </AppShell>
  );
}
