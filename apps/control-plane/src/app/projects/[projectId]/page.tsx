import AppShell from "@/components/shell/AppShell";
import RepositorySuccessDashboard from "@/components/dashboard/RepositorySuccessDashboard";

export default async function ProjectPage({ params }: { params: { projectId: string } }) {
  const projectId = params.projectId;

  return (
    <AppShell projectName={projectId} environment="commercial" runStatus="idle" mode="dashboard">
      <RepositorySuccessDashboard projectId={projectId} />
    </AppShell>
  );
}
