import { AppShell } from "@/components/shell/AppShell";
import ProofValidationPanel from "@/components/overview/ProofValidationPanel";
import ArtifactPanel from "@/components/overview/ArtifactPanel";
import PacketPanel from "@/components/overview/PacketPanel";

export default async function ProjectEvidencePage({ params }: { params: { projectId: string } }) {
  const projectId = params.projectId;

  return (
    <AppShell projectId={projectId}>
      <header className="northstar-workspace-topbar">
        <div>
          <div className="northstar-eyebrow">Evidence</div>
          <h2>Evidence</h2>
          <p>Review validation and proof artifacts.</p>
        </div>
      </header>
      <div className="northstar-content-grid">
        <main className="northstar-content">
          <section className="detail-page-grid">
            <ProofValidationPanel projectId={projectId} />
            <ArtifactPanel projectId={projectId} />
            <PacketPanel projectId={projectId} />
          </section>
        </main>
      </div>
    </AppShell>
  );
}
