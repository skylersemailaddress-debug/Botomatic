import { VibeBuilderSkeleton } from "@/components/builder/NorthStarBuilderShell";

export default async function ProjectVibePage({ params }: { params: { projectId: string } }) {
  return <VibeBuilderSkeleton projectId={params.projectId} />;
}
