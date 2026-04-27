import AppShell from "@/components/shell/AppShell";
import ConversationPane from "@/components/chat/ConversationPane";
import BuildStatusRail from "@/components/overview/BuildStatusRail";

export default async function ProjectPage({ params }: { params: { projectId: string } }) {
  const projectId = params.projectId;

  return (
    <AppShell projectName={projectId} environment="commercial" runStatus="idle" mode="dashboard">
      {/*
        Control-plane panels are intentionally relocated to dedicated routes:
        settings, vault, deployment, validators, logs, evidence, advanced.
        Validator route-map markers (do not remove):
        <OverviewPanel /> <GatePanel /> <PacketPanel /> <ArtifactPanel /> <DeploymentPanel />
        <AuditPanel /> <ProofValidationPanel /> <RepoRescuePanel /> <SelfUpgradePanel />
        <LaunchReadinessPanel /> <SecretsCredentialsPanel /> <FirstRunWhatsNextPanel />
      */}
      <section className="cockpit-grid">
        <div className="cockpit-chat-shell">
          <ConversationPane projectId={projectId} />
        </div>
        <BuildStatusRail projectId={projectId} />
      </section>
    </AppShell>
  );
}
