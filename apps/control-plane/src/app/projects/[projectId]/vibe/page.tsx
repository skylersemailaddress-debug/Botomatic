import AppShell from "@/components/shell/AppShell";
import ProductionPageShell from "@/components/shell/ProductionPageShell";
import { getValidatedWorkspaceView } from "@/components/shell/workspaceView";
import RepositorySuccessDashboard from "@/components/dashboard/RepositorySuccessDashboard";

export default async function ProjectVibePage({
  params,
  searchParams,
}: {
  params: { projectId: string };
  searchParams?: { view?: string };
}) {
  const projectId = params.projectId;
  const view = getValidatedWorkspaceView(searchParams?.view);

  return (
    <AppShell projectName={projectId} environment="commercial" runStatus="idle" mode="dashboard">
      <ProductionPageShell projectId={projectId} mode="vibe" view={view}>
        <RepositorySuccessDashboard projectId={projectId} mode="vibe" />
      </ProductionPageShell>
    </AppShell>
  );
}
