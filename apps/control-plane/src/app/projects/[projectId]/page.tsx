import { VibeDashboard } from "@/components/vibe/VibeDashboard";


function VibeBuilderSkeleton(props: any) {
  return <VibeDashboard {...props} />;
}

export default async function ProjectPage({ params }: { params: { projectId: string } }) {
  return <VibeBuilderSkeleton projectId={params.projectId} />;
}
