import { AppShell } from "@/components/shell/AppShell";
import AutonomousBuildRunPanel from "@/components/overview/AutonomousBuildRunPanel";
import SpecCompletenessPanel from "@/components/overview/SpecCompletenessPanel";
import BuildContractPanel from "@/components/overview/BuildContractPanel";
import GeneratedAppReadinessPanel from "@/components/overview/GeneratedAppReadinessPanel";
import LaunchBlockersPanel from "@/components/overview/LaunchBlockersPanel";

export default async function ProjectValidatorsPage({ params }: { params: { projectId: string } }) {
  const projectId = params.projectId;

  return (
    <AppShell projectId={projectId}>
      <header className="northstar-workspace-topbar">
        <div>
          <div className="northstar-eyebrow">Validators</div>
          <h2>Validators</h2>
          <p>Review validator results and build contracts.</p>
        </div>
      </header>
      <div className="northstar-content-grid">
        <main className="northstar-content">
          <section className="detail-page-grid">
            <AutonomousBuildRunPanel projectId={projectId} />
            <SpecCompletenessPanel projectId={projectId} />
            <BuildContractPanel projectId={projectId} />
            <GeneratedAppReadinessPanel projectId={projectId} />
            <LaunchBlockersPanel projectId={projectId} />
          </section>
        </main>
      </div>
    </AppShell>
  );
}
