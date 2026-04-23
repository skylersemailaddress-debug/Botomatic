import AppShell from "@/components/shell/AppShell";
import MainSplitLayout from "@/components/shell/MainSplitLayout";
import ConversationPane from "@/components/chat/ConversationPane";
import OverviewPanel from "@/components/overview/OverviewPanel";

export default async function ProjectPage({ params }: { params: { projectId: string } }) {
  const projectId = params.projectId;

  return (
    <AppShell projectName={projectId} environment="commercial" runStatus="idle">
      <MainSplitLayout
        left={<ConversationPane projectId={projectId} />}
        right={<OverviewPanel projectId={projectId} />}
      />
    </AppShell>
  );
}
