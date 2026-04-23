import AppShell from "@/components/shell/AppShell";
import MainSplitLayout from "@/components/shell/MainSplitLayout";
import ConversationPane from "@/components/chat/ConversationPane";
import OverviewPanel from "@/components/overview/OverviewPanel";
import GatePanel from "@/components/overview/GatePanel";
import DeploymentPanel from "@/components/overview/DeploymentPanel";
import PacketPanel from "@/components/overview/PacketPanel";
import ArtifactPanel from "@/components/overview/ArtifactPanel";
import AuditPanel from "@/components/overview/AuditPanel";

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
          </>
        )}
      />
    </AppShell>
  );
}
