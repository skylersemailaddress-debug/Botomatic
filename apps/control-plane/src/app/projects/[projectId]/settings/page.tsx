import ProjectWorkspaceShell from "@/components/project/ProjectWorkspaceShell";

export default async function ProjectSettingsPage({ params }: { params: { projectId: string } }) {
  const projectId = params.projectId;

  return (
    <ProjectWorkspaceShell projectId={projectId} mode="settings">
      <header className="northstar-workspace-topbar">
        <div>
          <div className="northstar-eyebrow">Settings</div>
          <h2>Project Settings</h2>
          <p>Identity, environments, integrations, access controls, and safety actions.</p>
        </div>
      </header>

      <section className="project-detail-grid" aria-label="Settings panels">
        <article className="project-detail-card">
          <h3>Identity</h3>
          <p>Set project name, primary contact, and launch ownership.</p>
          <div className="project-detail-list">
            <div className="project-detail-item"><strong>Project ID</strong><span className="project-status-pill">{projectId}</span></div>
            <div className="project-detail-item"><strong>Owner</strong><span className="project-status-pill">Skyler Admin</span></div>
            <div className="project-detail-item"><strong>Support Email</strong><span className="project-status-pill">Not configured</span></div>
          </div>
        </article>

        <article className="project-detail-card">
          <h3>Environment</h3>
          <p>Track runtime environment setup and route-level readiness.</p>
          <div className="project-detail-list">
            <div className="project-detail-item"><strong>Development</strong><span className="project-status-pill is-pass">Connected</span></div>
            <div className="project-detail-item"><strong>Staging</strong><span className="project-status-pill">Not configured</span></div>
            <div className="project-detail-item"><strong>Production</strong><span className="project-status-pill is-blocked">Approval required</span></div>
          </div>
        </article>

        <article className="project-detail-card">
          <h3>Integrations</h3>
          <p>Enable providers and confirm token readiness without exposing secrets.</p>
          <div className="project-detail-list">
            <div className="project-detail-item"><strong>Git Provider</strong><span className="project-status-pill">Not connected</span></div>
            <div className="project-detail-item"><strong>Deployment Provider</strong><span className="project-status-pill">Not connected</span></div>
            <div className="project-detail-item"><strong>Monitoring</strong><span className="project-status-pill">Not connected</span></div>
          </div>
        </article>

        <article className="project-detail-card">
          <h3>Access & Dangerous Actions</h3>
          <p>Guard high-risk operations with clear ownership and approval policies.</p>
          <div className="project-detail-list">
            <div className="project-detail-item"><strong>Role Matrix</strong><span className="project-status-pill">Pending setup</span></div>
            <div className="project-detail-item"><strong>Delete Project</strong><span className="project-status-pill is-blocked">Blocked</span></div>
            <div className="project-detail-item"><strong>Force Deploy</strong><span className="project-status-pill is-blocked">Blocked</span></div>
          </div>
        </article>
      </section>
    </ProjectWorkspaceShell>
  );
}
