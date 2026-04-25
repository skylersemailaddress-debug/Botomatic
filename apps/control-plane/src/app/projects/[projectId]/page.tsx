import AppShell from "@/components/shell/AppShell";
import MainSplitLayout from "@/components/shell/MainSplitLayout";
import ConversationPane from "@/components/chat/ConversationPane";
import OverviewPanel from "@/components/overview/OverviewPanel";
import GatePanel from "@/components/overview/GatePanel";
import DeploymentPanel from "@/components/overview/DeploymentPanel";
import PacketPanel from "@/components/overview/PacketPanel";
import ArtifactPanel from "@/components/overview/ArtifactPanel";
import AuditPanel from "@/components/overview/AuditPanel";
import SpecCompletenessPanel from "@/components/overview/SpecCompletenessPanel";
import OpenQuestionsPanel from "@/components/overview/OpenQuestionsPanel";
import AssumptionLedgerPanel from "@/components/overview/AssumptionLedgerPanel";
import RecommendationPanel from "@/components/overview/RecommendationPanel";
import BuildContractPanel from "@/components/overview/BuildContractPanel";
import GeneratedAppReadinessPanel from "@/components/overview/GeneratedAppReadinessPanel";
import LaunchBlockersPanel from "@/components/overview/LaunchBlockersPanel";

export default async function ProjectPage({ params }: { params: { projectId: string } }) {
  const projectId = params.projectId;

  return (
    <AppShell projectName={projectId} environment="commercial" runStatus="idle">
      <MainSplitLayout
        left={<ConversationPane projectId={projectId} />}
        right={(
          <>
            <OverviewPanel projectId={projectId} />
            <GatePanel projectId={projectId} />
            <PacketPanel projectId={projectId} />
            <ArtifactPanel projectId={projectId} />
            <DeploymentPanel projectId={projectId} />
            <AuditPanel projectId={projectId} />
            <SpecCompletenessPanel projectId={projectId} />
            <OpenQuestionsPanel projectId={projectId} />
            <AssumptionLedgerPanel projectId={projectId} />
            <RecommendationPanel projectId={projectId} />
            <BuildContractPanel projectId={projectId} />
            <GeneratedAppReadinessPanel projectId={projectId} />
            <LaunchBlockersPanel projectId={projectId} />
          </>
        )}
      />
    </AppShell>
  );
}
