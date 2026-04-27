import AppShell from "@/components/shell/AppShell";
import ProofValidationPanel from "@/components/overview/ProofValidationPanel";
import ArtifactPanel from "@/components/overview/ArtifactPanel";
import PacketPanel from "@/components/overview/PacketPanel";

export default async function ProjectEvidencePage({ params }: { params: { projectId: string } }) {
  const projectId = params.projectId;

  return (
    <AppShell projectName={projectId} environment="commercial" runStatus="idle" mode="page">
      <section className="detail-page-grid">
        <ProofValidationPanel projectId={projectId} />
        <ArtifactPanel projectId={projectId} />
        <PacketPanel projectId={projectId} />
      </section>
    </AppShell>
  );
}
