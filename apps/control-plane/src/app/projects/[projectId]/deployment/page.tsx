import ProjectWorkspaceShell from "@/components/project/ProjectWorkspaceShell";

export default async function ProjectDeploymentPage({ params }: { params: { projectId: string } }) {
  const projectId = params.projectId;

  return (
    <ProjectWorkspaceShell projectId={projectId} mode="deployment">
      <header className="northstar-workspace-topbar">
        <div>
          <div className="northstar-eyebrow">Deployment</div>
          <h2>Deployment</h2>
          <p>Targets, credentials, smoke tests, rollback readiness, and approvals.</p>
        </div>
      </header>

      <section className="project-detail-grid" aria-label="Deployment panels">
        <article className="project-detail-card">
          <h3>Targets</h3>
          <p>Define where this project can be deployed.</p>
          <div className="project-detail-list">
            <div className="project-detail-item"><strong>Development target</strong><span className="project-status-pill is-pass">Configured</span></div>
            <div className="project-detail-item"><strong>Staging target</strong><span className="project-status-pill">Not configured</span></div>
            <div className="project-detail-item"><strong>Production target</strong><span className="project-status-pill is-blocked">Approval required</span></div>
          </div>
        </article>

        <article className="project-detail-card">
          <h3>Deployment Gates</h3>
          <p>Gate launch on validator receipts and explicit pass conditions.</p>
          <div className="project-detail-list">
            <div className="project-detail-item"><strong>Build contract</strong><span className="project-status-pill">Not proven</span></div>
            <div className="project-detail-item"><strong>Runtime proof</strong><span className="project-status-pill">Not proven</span></div>
            <div className="project-detail-item"><strong>Rollback plan</strong><span className="project-status-pill is-pass">Defined</span></div>
          </div>
        </article>

        <article className="project-detail-card">
          <h3>Credentials & Smoke Test</h3>
          <p>Track credential readiness and post-deploy verification checks.</p>
          <div className="project-detail-list">
            <div className="project-detail-item"><strong>Deploy token</strong><span className="project-status-pill">Missing</span></div>
            <div className="project-detail-item"><strong>DNS credentials</strong><span className="project-status-pill">Missing</span></div>
            <div className="project-detail-item"><strong>Smoke test result</strong><span className="project-status-pill">Not run</span></div>
          </div>
        </article>

        <article className="project-detail-card">
          <h3>Approval Workflow</h3>
          <p>Production deploy requires owner approval and timestamped receipt.</p>
          <div className="project-detail-list">
            <div className="project-detail-item"><strong>Requested by</strong><span className="project-status-pill">Not requested</span></div>
            <div className="project-detail-item"><strong>Approved by</strong><span className="project-status-pill is-blocked">Pending</span></div>
            <div className="project-detail-item"><strong>Rollback checkpoint</strong><span className="project-status-pill">Prepared</span></div>
          </div>
        </article>
      </section>
    </ProjectWorkspaceShell>
  );
}
