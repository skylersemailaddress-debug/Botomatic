import { AppShell } from "@/components/shell/AppShell";
import FirstRunWhatsNextPanel from "@/components/overview/FirstRunWhatsNextPanel";
import IntakeHubPanel from "@/components/overview/IntakeHubPanel";

export default async function ProjectOnboardingPage({ params }: { params: { projectId: string } }) {
  const projectId = params.projectId;

  return (
    <AppShell projectId={projectId}>
      <header className="northstar-workspace-topbar">
        <div>
          <div className="northstar-eyebrow">Onboarding</div>
          <h2>Onboarding</h2>
          <p>Configure your project setup and next steps.</p>
        </div>
      </header>
      <div className="northstar-content-grid">
        <main className="northstar-content">
          <section className="detail-page-grid">
            <FirstRunWhatsNextPanel projectId={projectId} />
            <IntakeHubPanel projectId={projectId} />
          </section>
        </main>
      </div>
    </AppShell>
  );
}
