import ProjectWorkspaceShell from "@/components/project/ProjectWorkspaceShell";

export default async function ProjectOnboardingPage({ params }: { params: { projectId: string } }) {
  const projectId = params.projectId;

  return (
    <ProjectWorkspaceShell projectId={projectId} mode="onboarding">
      <header className="northstar-workspace-topbar">
        <div>
          <div className="northstar-eyebrow">Onboarding</div>
          <h2>Onboarding</h2>
          <p>Guided setup checklist to move from idea to verified runtime delivery.</p>
        </div>
      </header>

      <section className="project-detail-grid" aria-label="Onboarding checklist panels">
        <article className="project-detail-card">
          <h3>Step 1: Define Scope</h3>
          <p>Capture project intent, audience, and critical success criteria.</p>
          <div className="project-detail-list">
            <div className="project-detail-item"><strong>Primary objective</strong><span className="project-status-pill is-pass">Saved</span></div>
            <div className="project-detail-item"><strong>Out-of-scope guardrails</strong><span className="project-status-pill">Not started</span></div>
            <div className="project-detail-item"><strong>Commercial constraints</strong><span className="project-status-pill is-pass">Accepted</span></div>
          </div>
        </article>

        <article className="project-detail-card">
          <h3>Step 2: Connect Runtime</h3>
          <p>Attach required APIs and credentials before build commands run.</p>
          <div className="project-detail-list">
            <div className="project-detail-item"><strong>API token</strong><span className="project-status-pill is-pass">Present</span></div>
            <div className="project-detail-item"><strong>Data source</strong><span className="project-status-pill">Not connected</span></div>
            <div className="project-detail-item"><strong>Deployment provider</strong><span className="project-status-pill">Not connected</span></div>
          </div>
        </article>

        <article className="project-detail-card">
          <h3>Step 3: Validate</h3>
          <p>Run validators and capture receipts before launch requests.</p>
          <div className="project-detail-list">
            <div className="project-detail-item"><strong>UI regression checks</strong><span className="project-status-pill">Not run</span></div>
            <div className="project-detail-item"><strong>Proof packet generation</strong><span className="project-status-pill">Not run</span></div>
            <div className="project-detail-item"><strong>Owner launch e2e</strong><span className="project-status-pill is-blocked">Blocked</span></div>
          </div>
        </article>

        <article className="project-detail-card">
          <h3>Step 4: Launch</h3>
          <p>Launch remains unavailable until proof requirements are satisfied.</p>
          <div className="project-detail-list">
            <div className="project-detail-item"><strong>Launch readiness</strong><span className="project-status-pill">Not proven</span></div>
            <div className="project-detail-item"><strong>Manual approval</strong><span className="project-status-pill is-blocked">Pending</span></div>
            <div className="project-detail-item"><strong>One-click launch</strong><span className="project-status-pill is-blocked">Unavailable</span></div>
          </div>
        </article>
      </section>
    </ProjectWorkspaceShell>
  );
}
