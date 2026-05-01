import ProjectWorkspaceShell from "@/components/project/ProjectWorkspaceShell";

export default async function ProjectLogsPage({ params }: { params: { projectId: string } }) {
  const projectId = params.projectId;

  return (
    <ProjectWorkspaceShell projectId={projectId} mode="logs">
      <header className="northstar-workspace-topbar">
        <div>
          <div className="northstar-eyebrow">Logs</div>
          <h2>Logs</h2>
          <p>Structured logs with severity, timestamp, route filters, and source context.</p>
        </div>
      </header>

      <section className="project-detail-grid" aria-label="Log panels">
        <article className="project-detail-card">
          <h3>Filters</h3>
          <p>Filter by severity, source, and route to isolate issues quickly.</p>
          <div className="project-detail-list">
            <div className="project-detail-item"><strong>Severity</strong><span className="project-status-pill">info,warn,error</span></div>
            <div className="project-detail-item"><strong>Route</strong><span className="project-status-pill">/projects/{projectId}</span></div>
            <div className="project-detail-item"><strong>Window</strong><span className="project-status-pill">Last 60m</span></div>
          </div>
        </article>

        <article className="project-detail-card">
          <h3>Recent Events</h3>
          <p>Each entry includes timestamp, severity, and source subsystem.</p>
          <div className="project-detail-list">
            <div className="project-detail-item"><strong>2026-05-01T10:20:31Z · INFO · ui.runtime</strong><span className="project-status-pill is-pass">rendered</span></div>
            <div className="project-detail-item"><strong>2026-05-01T10:20:45Z · WARN · proof.runner</strong><span className="project-status-pill is-blocked">not proven</span></div>
            <div className="project-detail-item"><strong>2026-05-01T10:21:04Z · ERROR · deploy.api</strong><span className="project-status-pill is-fail">missing credentials</span></div>
          </div>
        </article>

        <article className="project-detail-card">
          <h3>Structured Output</h3>
          <p>JSON export is available through API, but secret values are redacted.</p>
          <div className="project-detail-list">
            <div className="project-detail-item"><strong>Schema</strong><span className="project-status-pill is-pass">v1</span></div>
            <div className="project-detail-item"><strong>Redaction</strong><span className="project-status-pill is-pass">enabled</span></div>
            <div className="project-detail-item"><strong>Tail stream</strong><span className="project-status-pill">Disconnected</span></div>
          </div>
        </article>

        <article className="project-detail-card">
          <h3>Operational Notes</h3>
          <p>No synthetic production health is displayed without real runtime evidence.</p>
          <div className="project-detail-list">
            <div className="project-detail-item"><strong>Production health</strong><span className="project-status-pill">Not connected</span></div>
            <div className="project-detail-item"><strong>Launch score</strong><span className="project-status-pill">Not proven</span></div>
            <div className="project-detail-item"><strong>Auto-remediation</strong><span className="project-status-pill">Manual review required</span></div>
          </div>
        </article>
      </section>
    </ProjectWorkspaceShell>
  );
}
