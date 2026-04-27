import AppShell from "@/components/shell/AppShell";
import IntakeHubPanel from "@/components/overview/IntakeHubPanel";
import RepoRescuePanel from "@/components/overview/RepoRescuePanel";
import SelfUpgradePanel from "@/components/overview/SelfUpgradePanel";
import FirstRunWhatsNextPanel from "@/components/overview/FirstRunWhatsNextPanel";
import OpenQuestionsPanel from "@/components/overview/OpenQuestionsPanel";
import AssumptionLedgerPanel from "@/components/overview/AssumptionLedgerPanel";
import RecommendationPanel from "@/components/overview/RecommendationPanel";
import OpsPanel from "@/components/ops/OpsPanel";

export default async function ProjectAdvancedPage({ params }: { params: { projectId: string } }) {
  const projectId = params.projectId;

  return (
    <AppShell projectName={projectId} environment="commercial" runStatus="idle" mode="page">
      <section className="detail-page-grid">
        <FirstRunWhatsNextPanel projectId={projectId} />
        <IntakeHubPanel projectId={projectId} />
        <RepoRescuePanel projectId={projectId} />
        <SelfUpgradePanel projectId={projectId} />
        <OpenQuestionsPanel projectId={projectId} />
        <AssumptionLedgerPanel projectId={projectId} />
        <RecommendationPanel projectId={projectId} />
        <OpsPanel />
      </section>
    </AppShell>
  );
}
