import { ProBuilderSkeleton } from "@/components/builder/NorthStarBuilderShell";

export default async function ProjectAdvancedPage({ params }: { params: { projectId: string } }) {
  return <ProBuilderSkeleton projectId={params.projectId} />;
}
