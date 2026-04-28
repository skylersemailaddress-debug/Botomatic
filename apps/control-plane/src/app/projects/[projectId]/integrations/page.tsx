import AppShell from "@/components/shell/AppShell";
import ProductionPageShell from "@/components/nexus/ProductionPageShell";

export default async function IntegrationsPage({ params }: { params: { projectId: string } }) {
  return (
    <AppShell projectName={params.projectId} environment="development" runStatus="idle" mode="page">
      <ProductionPageShell title="Integrations" description="Integrations workspace shell" />
    </AppShell>
  );
}
