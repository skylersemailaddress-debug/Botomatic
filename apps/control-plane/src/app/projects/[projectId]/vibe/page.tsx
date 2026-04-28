import { VibeDashboard } from "@/components/vibe/VibeDashboard";

export default async function ProjectVibePage({ params }: { params: { projectId: string } }) {
  return <VibeDashboard projectId={params.projectId} />;
}
