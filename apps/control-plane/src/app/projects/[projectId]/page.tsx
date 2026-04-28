import { VibeBuilderSkeleton } from "@/components/builder/NorthStarBuilderShell";

export default async function ProjectPage({ params }: { params: { projectId: string } }) {
  return <VibeBuilderSkeleton projectId={params.projectId} />;
}
