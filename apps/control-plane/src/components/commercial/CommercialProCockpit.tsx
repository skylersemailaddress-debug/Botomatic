"use client";

import { CommercialEmptyState, CommercialPanel } from "./CommercialPanel";

interface CommercialProCockpitProps {
  projectId: string;
}

const subnav = ["Overview", "Code", "Database", "API", "Tests", "Runtime", "Deployments", "Audit Log", "Integrations", "Secrets", "Settings"];

export function CommercialProCockpit({ projectId }: CommercialProCockpitProps) {
  return (
    <div className="commercial-pro" data-testid="commercial-pro-cockpit" data-project-id={projectId}>
      <header className="commercial-pro-header">
        <div>
          <h1>Pro Mode <span>PRO</span></h1>
          <p>Technical. Powerful. Complete control.</p>
        </div>
        <div className="commercial-pro-controls">
          <label><small>Project</small><strong>Current project</strong></label>
          <label><small>Branch</small><strong>main</strong></label>
          <label><small>Environment</small><strong>Development</strong></label>
          <button type="button">Run</button>
          <button type="button">Launch</button>
          <button type="button" className="is-primary">Deploy</button>
        </div>
      </header>

      <nav className="commercial-pro-subnav" aria-label="Pro navigation">
        {subnav.map((item) => <a key={item} className={item === "Overview" ? "is-active" : ""}>{item}</a>)}
      </nav>

      <section className="commercial-pro-grid" data-testid="commercial-pro-grid">
        <CommercialPanel title="Build Pipeline" className="span-7">
          <div className="commercial-pipeline">
            {["Design", "Features", "Data", "Logic", "Tests", "Launch", "Deploy"].map((step) => (
              <div key={step}>
                <span />
                <strong>{step}</strong>
                <small>Waiting</small>
              </div>
            ))}
          </div>
        </CommercialPanel>

        <CommercialPanel title="System Health" className="span-5">
          <div className="commercial-system-health">
            <div className="commercial-health-ring">--<small>Not evaluated yet</small></div>
            <div>
              <p><span>API health</span><strong>Not connected</strong></p>
              <p><span>Project status</span><strong>Backend state unavailable</strong></p>
              <p><span>Latest run</span><strong>Unverified</strong></p>
            </div>
          </div>
        </CommercialPanel>

        <CommercialPanel title="Code Changes" className="span-5">
          <CommercialEmptyState title="No generated source yet" detail="Repository diff will appear after a build writes source changes." />
        </CommercialPanel>

        <CommercialPanel title="Live Application" className="span-4">
          <div className="commercial-live-app">
            <div>No runtime preview yet.</div>
            <button type="button" disabled>Open Preview</button>
          </div>
        </CommercialPanel>

        <CommercialPanel title="Services" className="span-3">
          {["Next.js App", "API Server", "PostgreSQL", "Redis", "Storage", "Email Service"].map((item) => (
            <p className="commercial-row" key={item}><span>{item}</span><strong>Not connected</strong></p>
          ))}
        </CommercialPanel>

        <CommercialPanel title="Database Schema" className="span-3">
          <CommercialEmptyState title="No database schema generated yet" detail="Tables will appear when the app has real schema output." />
        </CommercialPanel>

        <CommercialPanel title="Test Results" className="span-3">
          <CommercialEmptyState title="No tests have run yet" detail="Validated test totals will appear after a real test run." />
        </CommercialPanel>

        <CommercialPanel title="Terminal" className="span-3">
          <pre className="commercial-terminal">No runtime logs yet.</pre>
        </CommercialPanel>

        <CommercialPanel title="AI Copilot" className="span-3">
          <div className="commercial-copilot">
            <p>Ask for a fix, build, review, or launch-readiness check.</p>
            <form><input aria-label="AI Copilot prompt" placeholder="Ask anything..." /><button type="submit">Send</button></form>
          </div>
        </CommercialPanel>

        <CommercialPanel title="Recent Commits" className="span-3">
          <CommercialEmptyState title="No commits yet" detail="Real repository commits will appear here when connected." />
        </CommercialPanel>
      </section>

      <footer className="commercial-status-bar">
        <span>Project Status: Draft</span>
        <span>Environment: Development</span>
        <span>Build: Not started</span>
        <span>Tests: Not run</span>
        <button type="button">Quick Actions</button>
      </footer>
    </div>
  );
}
