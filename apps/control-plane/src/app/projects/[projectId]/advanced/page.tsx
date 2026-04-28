import AppShell from "@/components/shell/AppShell";
import { ProBuilderSkeleton } from "@/components/builder/NorthStarBuilderShell";

export default async function ProjectAdvancedPage({
  params,
}: {
  params: { projectId: string };
}) {
  const projectId = params.projectId;

  return (
    <AppShell projectName={projectId} environment="commercial" runStatus="idle" mode="dashboard">
      <ProBuilderSkeleton projectId={projectId} />
    </AppShell>
  );
}
