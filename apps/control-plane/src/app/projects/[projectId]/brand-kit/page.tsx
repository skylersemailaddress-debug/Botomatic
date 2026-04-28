import AppShell from "@/components/shell/AppShell";
import ProductionPageShell from "@/components/nexus/ProductionPageShell";

export default async function BrandKitPage({ params }: { params: { projectId: string } }) {
  return (
    <AppShell projectName={params.projectId} environment="development" runStatus="idle" mode="page">
      <ProductionPageShell title="Brand Kit" description="Brand Kit workspace shell" />
    </AppShell>
  );
}
