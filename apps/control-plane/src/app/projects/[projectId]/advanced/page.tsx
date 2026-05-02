import { CommercialProCockpit } from "@/components/commercial/CommercialProCockpit";
import { CommercialWorkspaceShell } from "@/components/commercial/CommercialWorkspaceShell";

export default function ProjectAdvancedPage({ params }: { params: { projectId: string } }) {
  return (
    <CommercialWorkspaceShell projectId={params.projectId}>
      <CommercialProCockpit projectId={params.projectId} />
    </CommercialWorkspaceShell>
  );
}
