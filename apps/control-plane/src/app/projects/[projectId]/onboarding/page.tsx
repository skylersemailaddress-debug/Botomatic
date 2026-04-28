import AppShell from "@/components/shell/AppShell";
import FirstRunWhatsNextPanel from "@/components/overview/FirstRunWhatsNextPanel";

export default async function ProjectOnboardingPage({ params }: { params: { projectId: string } }) {
  const projectId = params.projectId;

  return (
    <AppShell projectName={projectId} environment="commercial" runStatus="idle" mode="page">
      <section className="detail-page-grid">
        <FirstRunWhatsNextPanel projectId={projectId} />
      </section>
    </AppShell>
  );
}
