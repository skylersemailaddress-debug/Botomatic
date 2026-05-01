import ProjectWorkspaceShell from "@/components/project/ProjectWorkspaceShell";

export default async function ProjectValidatorsPage({ params }: { params: { projectId: string } }) {
  const projectId = params.projectId;

  return (
    <ProjectWorkspaceShell projectId={projectId} mode="validators">
      <header className="northstar-workspace-topbar">
        <div>
          <div className="northstar-eyebrow">Validators</div>
          <h2>Validators</h2>
          <p>Validator groups, current status, and rerun guidance.</p>
        </div>
      </header>

      <section className="project-detail-grid" aria-label="Validator panels">
        <article className="project-detail-card">
          <h3>Core Runtime Validators</h3>
          <p>Route and runtime checks required for Vibe and Pro dashboards.</p>
          <div className="project-detail-list">
            <div className="project-detail-item"><strong>Shell layout integrity</strong><span className="project-status-pill is-pass">PASS</span></div>
            <div className="project-detail-item"><strong>Reference UI parity</strong><span className="project-status-pill is-fail">FAIL</span></div>
            <div className="project-detail-item"><strong>Debug surface check</strong><span className="project-status-pill is-pass">PASS</span></div>
          </div>
        </article>

        <article className="project-detail-card">
          <h3>Proof Validators</h3>
          <p>Proof artifacts must contain valid structure and non-placeholder evidence.</p>
          <div className="project-detail-list">
            <div className="project-detail-item"><strong>Claim boundary readiness</strong><span className="project-status-pill">NOT_PROVEN</span></div>
            <div className="project-detail-item"><strong>Independent audit artifact</strong><span className="project-status-pill is-blocked">BLOCKED</span></div>
            <div className="project-detail-item"><strong>Launch entitlement</strong><span className="project-status-pill is-blocked">BLOCKED</span></div>
          </div>
        </article>

        <article className="project-detail-card">
          <h3>Commercial Validators</h3>
          <p>Prevent overclaiming and enforce truthful runtime wording.</p>
          <div className="project-detail-list">
            <div className="project-detail-item"><strong>No fake 99% claim</strong><span className="project-status-pill is-pass">PASS</span></div>
            <div className="project-detail-item"><strong>No fake deployment health</strong><span className="project-status-pill is-pass">PASS</span></div>
            <div className="project-detail-item"><strong>Subpage consistency</strong><span className="project-status-pill">NOT_PROVEN</span></div>
          </div>
        </article>

        <article className="project-detail-card">
          <h3>Rerun Guidance</h3>
          <p>Rerun in order to recover from blocked states.</p>
          <div className="project-detail-list">
            <div className="project-detail-item"><strong>1. npm run validate:all</strong><span className="project-status-pill">Required</span></div>
            <div className="project-detail-item"><strong>2. npm run test</strong><span className="project-status-pill">Required</span></div>
            <div className="project-detail-item"><strong>3. npm run test:e2e:beta-owner-launch</strong><span className="project-status-pill">Required</span></div>
          </div>
        </article>
      </section>
    </ProjectWorkspaceShell>
  );
}
