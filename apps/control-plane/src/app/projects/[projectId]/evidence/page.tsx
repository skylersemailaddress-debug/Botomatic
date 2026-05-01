import ProjectWorkspaceShell from "@/components/project/ProjectWorkspaceShell";

export default async function ProjectEvidencePage({ params }: { params: { projectId: string } }) {
  const projectId = params.projectId;

  return (
    <ProjectWorkspaceShell projectId={projectId} mode="evidence">
      <header className="northstar-workspace-topbar">
        <div>
          <div className="northstar-eyebrow">Evidence</div>
          <h2>Evidence</h2>
          <p>Review proof artifacts and validator receipts with fail-closed status labels.</p>
        </div>
      </header>

      <section className="project-detail-grid" aria-label="Evidence panels">
        <article className="project-detail-card">
          <h3>Proof Artifacts</h3>
          <p>Generated proof packets for runtime, execution, and launch workflows.</p>
          <div className="project-detail-list">
            <div className="project-detail-item"><strong>Runtime proof artifact</strong><span className="project-status-pill">NOT_PROVEN</span></div>
            <div className="project-detail-item"><strong>Execution proof artifact</strong><span className="project-status-pill">NOT_PROVEN</span></div>
            <div className="project-detail-item"><strong>Launch proof artifact</strong><span className="project-status-pill is-blocked">BLOCKED</span></div>
          </div>
        </article>

        <article className="project-detail-card">
          <h3>Validator Receipts</h3>
          <p>Receipt outcomes are shown exactly as provided by validators.</p>
          <div className="project-detail-list">
            <div className="project-detail-item"><strong>Commercial consistency</strong><span className="project-status-pill is-pass">PASS</span></div>
            <div className="project-detail-item"><strong>Launch readiness</strong><span className="project-status-pill is-fail">FAIL</span></div>
            <div className="project-detail-item"><strong>Independent audit</strong><span className="project-status-pill is-blocked">BLOCKED</span></div>
          </div>
        </article>

        <article className="project-detail-card">
          <h3>Receipt Timeline</h3>
          <p>Latest proof runs with explicit verification state and source.</p>
          <div className="project-detail-list">
            <div className="project-detail-item"><strong>Claim boundary audit</strong><span className="project-status-pill">NOT_PROVEN</span></div>
            <div className="project-detail-item"><strong>Owner launch browser run</strong><span className="project-status-pill">NOT_PROVEN</span></div>
            <div className="project-detail-item"><strong>Pixel reference check</strong><span className="project-status-pill">NOT_PROVEN</span></div>
          </div>
        </article>

        <article className="project-detail-card">
          <h3>Evidence Actions</h3>
          <p>Next steps to move blocked evidence into a proven state.</p>
          <div className="project-detail-list">
            <div className="project-detail-item"><strong>Run validators</strong><span className="project-status-pill">Available</span></div>
            <div className="project-detail-item"><strong>Upload manual evidence</strong><span className="project-status-pill">Available</span></div>
            <div className="project-detail-item"><strong>Mark as proven</strong><span className="project-status-pill is-blocked">Blocked by receipts</span></div>
          </div>
        </article>
      </section>
    </ProjectWorkspaceShell>
  );
}
