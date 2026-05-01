import ProjectWorkspaceShell from "@/components/project/ProjectWorkspaceShell";

export default async function ProjectVaultPage({ params }: { params: { projectId: string } }) {
  const projectId = params.projectId;

  return (
    <ProjectWorkspaceShell projectId={projectId} mode="vault">
      <header className="northstar-workspace-topbar">
        <div>
          <div className="northstar-eyebrow">Vault</div>
          <h2>Vault</h2>
          <p>Credential readiness and secret policy checks with values fully redacted.</p>
        </div>
      </header>

      <section className="project-detail-grid" aria-label="Vault panels">
        <article className="project-detail-card">
          <h3>Credential Readiness</h3>
          <p>Check whether required credentials exist without showing secret material.</p>
          <div className="project-detail-list">
            <div className="project-detail-item"><strong>API_AUTH_TOKEN</strong><span className="project-status-pill is-pass">Present</span></div>
            <div className="project-detail-item"><strong>BOTOMATIC_API_TOKEN</strong><span className="project-status-pill is-pass">Present</span></div>
            <div className="project-detail-item"><strong>DEPLOY_PROVIDER_TOKEN</strong><span className="project-status-pill">Missing</span></div>
          </div>
        </article>

        <article className="project-detail-card">
          <h3>Rotation Policy</h3>
          <p>Track token rotation cadence and owner assignment.</p>
          <div className="project-detail-list">
            <div className="project-detail-item"><strong>Last rotation</strong><span className="project-status-pill">Unknown</span></div>
            <div className="project-detail-item"><strong>Next rotation due</strong><span className="project-status-pill is-blocked">Not scheduled</span></div>
            <div className="project-detail-item"><strong>Owner assigned</strong><span className="project-status-pill">Pending</span></div>
          </div>
        </article>

        <article className="project-detail-card">
          <h3>Access Scope</h3>
          <p>Least-privilege access boundaries for runtime and deployment tooling.</p>
          <div className="project-detail-list">
            <div className="project-detail-item"><strong>Read scope</strong><span className="project-status-pill is-pass">Limited</span></div>
            <div className="project-detail-item"><strong>Write scope</strong><span className="project-status-pill is-blocked">Approval required</span></div>
            <div className="project-detail-item"><strong>Audit logging</strong><span className="project-status-pill is-pass">Enabled</span></div>
          </div>
        </article>
      </section>
    </ProjectWorkspaceShell>
  );
}
