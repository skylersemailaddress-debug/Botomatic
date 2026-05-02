"use client";

import { CommercialEmptyState, CommercialPanel } from "./CommercialPanel";

interface CommercialVibeCockpitProps {
  projectId: string;
}

const buildSteps = ["Design", "Features", "Data", "Testing", "Launch"];
const nextActions = ["Describe app idea", "Add logo", "Payment setup", "Email notifications"];

export function CommercialVibeCockpit({ projectId }: CommercialVibeCockpitProps) {
  return (
    <div className="commercial-vibe commercial-vibe-reference" data-testid="commercial-vibe-cockpit" data-project-id={projectId}>
      <header className="commercial-vibe-header commercial-reference-header">
        <div className="commercial-heading-stack">
          <span className="commercial-pill">VIBE</span>
          <div>
            <h1>Vibe Mode</h1>
            <p>Chat. Design. Build. Launch. All in one flow.</p>
          </div>
        </div>
        <div className="commercial-device-switcher" role="tablist" aria-label="Device preview">
          <button type="button" className="is-active">Desktop</button>
          <button type="button">Tablet</button>
          <button type="button">Mobile</button>
        </div>
        <div className="commercial-top-actions commercial-icon-actions">
          <button type="button" aria-label="Undo">↶</button>
          <button type="button" aria-label="Redo">↷</button>
          <button type="button" aria-label="Help">?</button>
          <button type="button">Share</button>
          <button type="button" disabled>Launch unavailable</button>
        </div>
      </header>

      <div className="commercial-vibe-grid commercial-vibe-reference-grid">
        <section className="commercial-vibe-center">
          <section className="commercial-vibe-chat-flow" aria-label="Vibe build conversation">
            <div className="commercial-message is-user">Describe the app you want to build.</div>
            <div className="commercial-message is-bot commercial-progress-message">
              <p>I can design the first screen, build the app structure, and prepare launch checks when you are ready.</p>
              <div className="commercial-progress-chips">
                <span>Understand request</span>
                <span>Design UI</span>
                <span>Plan features</span>
                <span>Prepare build</span>
              </div>
            </div>
          </section>

          <section className="commercial-preview-card commercial-vibe-preview-frame" data-testid="commercial-preview-card">
            <div className="commercial-preview-toolbar">
              <button type="button">Edit</button>
              <div>
                <button type="button">Desktop</button>
                <button type="button">Tablet</button>
                <button type="button">Mobile</button>
              </div>
              <button type="button">Version</button>
            </div>
            <div className="commercial-preview-empty commercial-reference-preview-empty">
              <strong>No generated preview yet</strong>
              <p>Describe the app you want to build to generate the first screen.</p>
            </div>
          </section>

          <div className="commercial-suggestions">
            <span>Try saying:</span>
            <button type="button">Make it more minimal</button>
            <button type="button">Add a pricing section</button>
            <button type="button">Improve mobile view</button>
            <button type="button">Add testimonials</button>
          </div>

          <section className="commercial-command-bar commercial-vibe-command-dock" data-testid="commercial-vibe-command-bar">
            <form>
              <input aria-label="Vibe prompt" placeholder="Ask anything... (e.g., add a pricing section, make the hero bolder, add dark mode)" />
              <button type="submit">Send</button>
            </form>
            <div>
              <button type="button">Improve Design</button>
              <button type="button">Add Page</button>
              <button type="button">Add Feature</button>
              <button type="button">Connect Payments</button>
              <button type="button">Run Tests</button>
              <button type="button" disabled>Launch App</button>
            </div>
          </section>
        </section>

        <aside className="commercial-vibe-rail commercial-vibe-rail-grid" data-testid="commercial-vibe-right-rail">
          <CommercialPanel title="Build Map" eyebrow="View Audit →">
            <div className="commercial-build-steps commercial-build-map-reference">
              {buildSteps.map((step) => (
                <div key={step}>
                  <span />
                  <strong>{step}</strong>
                  <small>Pending</small>
                </div>
              ))}
            </div>
          </CommercialPanel>

          <div className="commercial-two-up">
            <CommercialPanel title="Live Preview" eyebrow="Pending">
              <div className="commercial-mini-preview">Preview will appear after your first build.</div>
            </CommercialPanel>
            <CommercialPanel title="App Health">
              <div className="commercial-health-ring">--<small>Not evaluated yet</small></div>
            </CommercialPanel>
          </div>

          <CommercialPanel title="What's Next">
            <div className="commercial-next-grid">
              {nextActions.map((action, index) => (
                <button type="button" key={action} disabled={index > 1}>{action}</button>
              ))}
            </div>
          </CommercialPanel>

          <CommercialPanel title="Recent Activity">
            <CommercialEmptyState title="No activity yet" detail="Project actions will appear here once a build starts." />
          </CommercialPanel>

          <section className="commercial-launch-panel">
            <h2>One-Click Launch</h2>
            <p>Launch becomes available after build, validation, and source sync pass.</p>
            <button type="button" disabled>Launch unavailable</button>
          </section>
        </aside>
      </div>
    </div>
  );
}
