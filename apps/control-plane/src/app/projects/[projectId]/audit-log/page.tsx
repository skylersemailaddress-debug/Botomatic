import AppShell from "@/components/shell/AppShell";
import ProductionPageShell from "@/components/nexus/ProductionPageShell";

export default async function AuditLogPage({ params }: { params: { projectId: string } }) {
  return (
    <AppShell projectName={params.projectId} environment="development" runStatus="idle" mode="page">
      <ProductionPageShell title="Audit Log" description="Audit Log workspace shell" />
    </AppShell>
  );
}
