import { CommercialVibeCockpit } from "@/components/commercial/CommercialVibeCockpit";
import { CommercialWorkspaceShell } from "@/components/commercial/CommercialWorkspaceShell";

export default function ProjectVibePage({ params }: { params: { projectId: string } }) {
  return (
    <CommercialWorkspaceShell projectId={params.projectId}>
      <CommercialVibeCockpit projectId={params.projectId} />
    </CommercialWorkspaceShell>
  );
}
