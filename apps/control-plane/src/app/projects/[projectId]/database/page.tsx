import AppShell from "@/components/shell/AppShell";
import ProductionPageShell from "@/components/nexus/ProductionPageShell";

export default async function DatabasePage({ params }: { params: { projectId: string } }) {
  return (
    <AppShell projectName={params.projectId} environment="development" runStatus="idle" mode="page">
      <ProductionPageShell title="Database" description="Database workspace shell" />
    </AppShell>
  );
}
