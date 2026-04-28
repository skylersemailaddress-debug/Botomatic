import Link from "next/link";

import {
  buildPipelineSteps,
  commitRows,
  proRecentProjects,
  proSecondaryNav,
  proSidebarNav,
  schemaRows,
  serviceRows,
  systemHealthRows,
} from "./proSeedData";

export function ProDashboard({ projectId }: { projectId: string }) {
  return (
    <section className="pro-dashboard" aria-label="Pro dashboard" data-project-id={projectId}>
      <aside className="pro-dashboard-sidebar" aria-label="Botomatic sidebar">
        <Link href="/" className="pro-dashboard-brand">
          <span className="pro-dashboard-brand-icon">⬢</span>
          <span>
            <strong>Botomatic</strong>
            <small>NEXUS</small>
          </span>
        </Link>

        <button type="button" className="pro-dashboard-new-project">+ New Project</button>

        <nav className="pro-dashboard-nav" aria-label="Main navigation">
          {proSidebarNav.map((item) => <button type="button" key={item}>{item}</button>)}
        </nav>

        <div className="pro-sidebar-card">
          <h3>Recent Projects</h3>
          {proRecentProjects.map((project, index) => (
            <div className={`pro-sidebar-row${index === 0 ? " is-active" : ""}`} key={project.name}>
              <span>{project.name}</span>
              <small>{project.updated}</small>
            </div>
          ))}
          <button type="button" className="pro-link-button">View all projects →</button>
        </div>

        <div className="pro-sidebar-upgrade">
          <h3>Go Pro Anytime</h3>
          <p>Unlock advanced features, team collaboration, and priority support.</p>
          <button type="button">Upgrade to Pro</button>
        </div>

        <div className="pro-sidebar-profile">
          <strong>Alex Johnson</strong>
          <small>alex@example.com</small>
          <button type="button">Light Mode</button>
        </div>
      </aside>

      <div className="pro-dashboard-main">
        <header className="pro-topbar">
          <div>
            <h1>Pro Mode <span>PRO</span></h1>
            <p>Technical. Powerful. Complete control.</p>
          </div>

          <div className="pro-toolbar">
            <div className="pro-select">Project <strong>Luxury Booking Platform</strong></div>
            <div className="pro-select">Branch <strong>● main</strong></div>
            <div className="pro-select">Environment <strong>Development</strong></div>
            <button type="button">Run All</button>
            <button type="button">Launch</button>
            <button type="button" className="is-primary">Deploy</button>
            <div className="pro-toolbar-icons" aria-label="Search/help/notifications/profile">⌕ ⓘ 🔔 👤</div>
          </div>
        </header>

        <nav className="pro-subnav" aria-label="Pro navigation">
          {proSecondaryNav.map((item, index) => <button type="button" key={item} className={index === 0 ? "is-active" : ""}>{item}</button>)}
        </nav>

        <div className="pro-grid">
          <section className="pro-panel">
            <header><h2>Build Pipeline</h2><button type="button" className="pro-link-button">View Full Pipeline →</button></header>
            <div className="pro-pipeline">
              {buildPipelineSteps.map((step) => (
                <div className="pro-pipeline-step" key={step.label}>
                  <div className={`pro-dot is-${step.tone}`}>{step.tone === "done" ? "✓" : step.tone === "active" ? "◎" : "○"}</div>
                  <strong>{step.label}</strong>
                  <small>{step.status}</small>
                  <small>{step.time}</small>
                </div>
              ))}
            </div>
          </section>

          <section className="pro-panel">
            <header><h2>System Health</h2></header>
            <div className="pro-health">
              <div className="pro-health-ring">92%<small>Excellent</small></div>
              <div>
                {systemHealthRows.map((item) => <div className="pro-health-row" key={item.label}><span>{item.label}</span><strong>{item.value}</strong></div>)}
                <button type="button" className="pro-link-button">View full report →</button>
              </div>
            </div>
          </section>

          <section className="pro-panel pro-panel--wide">
            <header><h2>Code Changes</h2></header>
            <div className="pro-code-tabs"><button type="button" className="is-active">Staged (24)</button><button type="button">Unstaged (7)</button><button type="button">All Changes (31)</button><strong>+412 additions</strong><strong>-103 deletions</strong></div>
            <div className="pro-code-shell">
              <div className="pro-file-tree">apps/web · app · page.tsx · layout.tsx · components · lib</div>
              <pre>{`import { Button } from "@/components/ui/button"
- <Hero title="Luxury stays, unforgettable moments." />
+ <Hero
+   title="Your Escape Awaits"
+   subtitle="Experience unparalleled luxury and unforgettable moments."
+   ctaPrimary="Book Your Stay"
+   ctaSecondary="Explore Rooms"
+ />`}</pre>
            </div>
          </section>

          <section className="pro-panel pro-panel--wide">
            <header><h2>Live Application</h2><strong className="pro-live">● Live</strong></header>
            <div className="pro-url-bar">http://localhost:3000 <button type="button">Open in Browser</button></div>
            <div className="pro-hotel-preview" aria-label="luxury hotel preview">
              <div className="pro-preview-top"><span>LUXORA</span><span>Home · Rooms · Experiences · About · Contact</span><button type="button">Book Now</button></div>
              <h3>Your Escape Awaits</h3>
              <p>Experience unparalleled luxury and unforgettable moments.</p>
              <div><button type="button">Book Your Stay</button><button type="button">Explore Rooms</button></div>
            </div>
            <div className="pro-runtime-controls"><span>Local Server · Running · Port: 3000</span><div><button type="button">Restart</button><button type="button">Stop</button><button type="button">View Logs</button></div></div>
          </section>

          <section className="pro-panel">
            <header><h2>Services</h2></header>
            <small>All Systems Operational</small>
            {serviceRows.map((service) => <div className="pro-service-row" key={service}><span>{service}</span><strong>Running</strong></div>)}
          </section>

          <section className="pro-panel">
            <header><h2>Database Schema</h2><button type="button" className="pro-link-button">View in DB</button></header>
            {schemaRows.map((item) => <div className="pro-service-row" key={item.table}><span>{item.table}</span><small>{item.rows}</small></div>)}
          </section>

          <section className="pro-panel">
            <header><h2>Test Results</h2><button type="button" className="pro-link-button">Run All Tests</button></header>
            <div className="pro-test-total">198 <small>Total Tests</small></div>
            <div className="pro-health-row"><span>Passed</span><strong>178 (90%)</strong></div>
            <div className="pro-health-row"><span>Failed</span><strong>12 (6%)</strong></div>
            <div className="pro-health-row"><span>Skipped</span><strong>8 (4%)</strong></div>
            <div className="pro-test-list">Unit · Integration · E2E · API · Security tests</div>
          </section>

          <section className="pro-panel">
            <header><h2>Terminal</h2></header>
            <div className="pro-code-tabs"><button type="button" className="is-active">Build Logs</button><button type="button">Runtime Logs</button><button type="button">Deploy Logs</button><button type="button">AI Actions</button></div>
            <pre className="pro-terminal">10:42:31 INFO Installing dependencies...
10:42:35 SUCCESS All dependencies installed (1243 packages)
10:42:40 INFO Compiling TypeScript...
10:42:46 SUCCESS Compilation successful (2.45s)
10:42:48 INFO Running linter...
10:42:52 SUCCESS 178/198 tests passed
10:42:53 SUCCESS Local server running at http://localhost:3000</pre>
          </section>

          <section className="pro-panel">
            <header><h2>AI Copilot</h2><button type="button" className="pro-link-button">Clear Chat</button></header>
            <div className="pro-chat-msg is-user">Can you optimize the booking query?</div>
            <div className="pro-chat-msg">I&apos;ve optimized the booking query by adding indexes and reducing N+1 queries. Performance improved by 47%.</div>
            <div className="pro-chat-input">Ask anything... (e.g., fix bug, add feature)</div>
          </section>

          <section className="pro-panel">
            <header><h2>Recent Commits</h2><button type="button" className="pro-link-button">View all →</button></header>
            {commitRows.map((commit) => <div className="pro-commit-row" key={commit.message}><span>{commit.message}<small>{commit.author}</small></span><small>{commit.time}</small></div>)}
          </section>
        </div>

        <footer className="pro-status-bar" aria-label="Bottom project status bar">
          <span>Project Status <strong>● Active</strong></span>
          <span>Environment <strong>Development</strong></span>
          <span>Last Deployed <strong>1h ago to staging</strong></span>
          <span>Build <strong>#2457 Passing</strong></span>
          <span>Tests <strong>178/198 · 90%</strong></span>
          <span>Issues <strong>3 Open</strong></span>
          <span>Branch <strong>main</strong></span>
        </footer>
      </div>
    </section>
  );
}
