import AppShell from "@/components/shell/AppShell";
import RepositorySuccessDashboard from "@/components/dashboard/RepositorySuccessDashboard";

export default async function ProjectAdvancedPage({ params }: { params: { projectId: string } }) {
  const projectId = params.projectId;

  return (
    <AppShell projectName={projectId} environment="development" runStatus="idle" mode="dashboard">
      <RepositorySuccessDashboard projectId={projectId} mode="pro" />
    </AppShell>
  );
}
