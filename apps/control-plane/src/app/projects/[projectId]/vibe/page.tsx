import { VibeDashboard } from "@/components/vibe/VibeDashboard";

export const dynamic = "force-dynamic";

export default function ProjectVibePage({ params }: { params: { projectId: string } }) {
  return <VibeDashboard projectId={params.projectId} />;
}
