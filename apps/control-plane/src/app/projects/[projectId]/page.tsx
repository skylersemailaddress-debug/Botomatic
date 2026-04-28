import RepositorySuccessDashboard from "@/components/dashboard/RepositorySuccessDashboard";

export default async function ProjectPage({ params }: { params: { projectId: string } }) {
  return <RepositorySuccessDashboard projectId={params.projectId} />;
}
