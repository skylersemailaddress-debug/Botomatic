import AppShell from "@/components/shell/AppShell";
import OverviewPanel from "@/components/overview/OverviewPanel";
import GatePanel from "@/components/overview/GatePanel";
import PacketPanel from "@/components/overview/PacketPanel";
import ArtifactPanel from "@/components/overview/ArtifactPanel";
import DeploymentPanel from "@/components/overview/DeploymentPanel";
import AuditPanel from "@/components/overview/AuditPanel";
import ProofValidationPanel from "@/components/overview/ProofValidationPanel";
import RepoRescuePanel from "@/components/overview/RepoRescuePanel";
import SelfUpgradePanel from "@/components/overview/SelfUpgradePanel";
import LaunchReadinessPanel from "@/components/overview/LaunchReadinessPanel";
import SecretsCredentialsPanel from "@/components/overview/SecretsCredentialsPanel";
import FirstRunWhatsNextPanel from "@/components/overview/FirstRunWhatsNextPanel";

export default async function ProjectPage({ params }: { params: { projectId: string } }) {
  const projectId = params.projectId;

  return (
    <AppShell projectName={projectId} environment="commercial" runStatus="idle" mode="page">
      <section className="detail-page-grid">
        <OverviewPanel projectId={projectId} />
        <GatePanel projectId={projectId} />
        <PacketPanel projectId={projectId} />
        <ArtifactPanel projectId={projectId} />
        <DeploymentPanel projectId={projectId} />
        <AuditPanel projectId={projectId} />
        <ProofValidationPanel projectId={projectId} />
        <LaunchReadinessPanel projectId={projectId} />
        <SecretsCredentialsPanel projectId={projectId} />
        <FirstRunWhatsNextPanel projectId={projectId} />
        <RepoRescuePanel projectId={projectId} />
        <SelfUpgradePanel projectId={projectId} />
      </section>
    </AppShell>
  );
}
