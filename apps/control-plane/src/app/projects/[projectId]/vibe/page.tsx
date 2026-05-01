import { VibeClientOnly } from "./VibeClientOnly";

export const dynamic = "force-dynamic";

export default function ProjectVibePage({ params }: { params: { projectId: string } }) {
  return <VibeClientOnly projectId={params.projectId} />;
}
