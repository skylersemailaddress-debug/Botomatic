import { VibeWiredClient } from "./VibeWiredClient";

export const dynamic = "force-dynamic";

export default function ProjectVibePage({ params }: { params: { projectId: string } }) {
  return <VibeWiredClient projectId={params.projectId} />;
}
