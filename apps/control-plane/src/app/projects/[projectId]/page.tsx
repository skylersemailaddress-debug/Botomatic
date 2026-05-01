import { VibeWiredClient } from "./vibe/VibeWiredClient";

export const dynamic = "force-dynamic";

export default function ProjectPage({ params }: { params: { projectId: string } }) {
  return <VibeWiredClient projectId={params.projectId} />;
}
