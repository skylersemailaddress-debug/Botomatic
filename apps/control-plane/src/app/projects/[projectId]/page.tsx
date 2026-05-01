import { VibeDashboard } from "@/components/vibe/VibeDashboard";


function VibeBuilderSkeleton(props: any) {
  const ExistingShell = (require('./vibe/VibeClientOnly').default || require('./vibe/VibeClientOnly').VibeClientOnly);
  return <ExistingShell {...props} />;
}

export default async function ProjectPage({ params }: { params: { projectId: string } }) {
  return <VibeBuilderSkeleton projectId={params.projectId} />;
}
