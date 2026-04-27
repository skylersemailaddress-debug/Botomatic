import AppShell from "@/components/shell/AppShell";
import GatePanel from "@/components/overview/GatePanel";
import SecurityCenterPanel from "@/components/overview/SecurityCenterPanel";
import LaunchReadinessPanel from "@/components/overview/LaunchReadinessPanel";

export default async function ProjectSettingsPage({ params }: { params: { projectId: string } }) {
  const projectId = params.projectId;

  return (
    <AppShell projectName={projectId} environment="commercial" runStatus="idle" mode="page">
      <section className="detail-page-grid">
        <GatePanel projectId={projectId} />
        <LaunchReadinessPanel projectId={projectId} />
        <SecurityCenterPanel projectId={projectId} />
      </section>
    </AppShell>
  );
}
