import RepositorySuccessDashboard from "@/components/dashboard/RepositorySuccessDashboard";

export const dynamic = "force-dynamic";

export default function VibeProjectPage({
  params,
}: {
  params: { projectId: string };
}) {
  return <RepositorySuccessDashboard projectId={params.projectId} mode="vibe" />;
}
