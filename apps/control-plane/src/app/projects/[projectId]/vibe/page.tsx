import AppShell from "@/components/shell/AppShell";
import { VibeBuilderSkeleton } from "@/components/builder/NorthStarBuilderShell";

export default async function ProjectVibePage({
  params,
}: {
  params: { projectId: string };
}) {
  const projectId = params.projectId;

  return (
    <AppShell projectName={projectId} environment="commercial" runStatus="idle" mode="dashboard">
      <VibeBuilderSkeleton projectId={projectId} />
    </AppShell>
  );
}
