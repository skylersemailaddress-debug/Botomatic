import { VibeDashboard } from "@/components/vibe/VibeDashboard";

export default async function ProjectPage({ params }: { params: { projectId: string } }) {
  return <VibeDashboard projectId={params.projectId} />;
}
