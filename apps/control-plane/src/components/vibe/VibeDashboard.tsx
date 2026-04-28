import Link from "next/link";

import { actionChips, buildMapItems, recentActivity, recentProjects, suggestionChips, vibeSidebarNav } from "./vibeSeedData";

export function VibeDashboard({ projectId }: { projectId: string }) {
  return (
    <section className="vibe-dashboard" aria-label="Vibe dashboard" data-project-id={projectId}>
      <aside className="vibe-dashboard-sidebar" aria-label="Botomatic sidebar">
        <Link href="/" className="vibe-dashboard-brand">
          <span className="vibe-dashboard-brand-icon">⬢</span>
          <span>
            <strong>Botomatic</strong>
            <small>NEXUS</small>
          </span>
        </Link>

        <button type="button" className="vibe-dashboard-new-project">+ New Project</button>

        <nav className="vibe-dashboard-nav" aria-label="Dashboard navigation">
          {vibeSidebarNav.map((item) => <button type="button" key={item} className={item === "Home" ? "is-active" : ""}>{item}</button>)}
        </nav>

        <div className="vibe-dashboard-card">
          <h3>Recent Projects</h3>
          {recentProjects.map((project) => (
            <div key={project.name} className="vibe-dashboard-row">
              <span>{project.name}</span>
              <small>{project.updated}</small>
            </div>
          ))}
        </div>

        <div className="vibe-dashboard-upgrade">
          <h3>Go Pro Anytime</h3>
          <p>Unlock advanced features, team collaboration, and priority support.</p>
          <button type="button">Upgrade to Pro</button>
        </div>
      </aside>

      <div className="vibe-dashboard-main">
        <header className="vibe-dashboard-header">
          <div>
            <h1>Vibe Mode</h1>
            <p>Chat. Design. Build. Launch. All in one flow.</p>
          </div>
          <div className="vibe-dashboard-device-switcher" role="tablist" aria-label="Device preview switcher">
            <button type="button" className="is-active">Desktop</button>
            <button type="button">Tablet</button>
            <button type="button">Mobile</button>
          </div>
          <div className="vibe-dashboard-cta-group">
            <button type="button" className="vibe-dashboard-share">Share</button>
            <button type="button" className="vibe-dashboard-launch">Launch App</button>
          </div>
        </header>

        <div className="vibe-dashboard-layout">
          <main>
            <section className="vibe-chat-timeline">
              <div className="vibe-msg vibe-msg-user">Build me a modern booking website for a luxury hotel with a beautiful landing page.</div>
              <div className="vibe-msg vibe-msg-agent">
                I&apos;ve got you! I&apos;ll create a luxury hotel booking website with a stunning landing page.
                <div className="vibe-msg-pills">
                  <span>Understanding your idea</span>
                  <span>Designing the UI</span>
                  <span>Planning the features</span>
                  <span>Building it all together</span>
                </div>
              </div>

              <article className="vibe-live-preview" aria-label="Live editable luxury hotel preview">
                <header>
                  <p>Here&apos;s your live design. You can edit anything by clicking on it.</p>
                  <div>
                    <button type="button">Edit</button>
                    <button type="button">Version 3</button>
                  </div>
                </header>
                <div className="vibe-hotel-preview">
                  <div className="vibe-hotel-nav"><span>LUXORA</span><span>Home · Rooms · Experiences · About · Contact</span><button type="button">Book Now</button></div>
                  <h2>Your Escape Awaits</h2>
                  <p>Experience unparalleled luxury and unforgettable moments.</p>
                  <div className="vibe-hotel-actions"><button type="button">Book Your Stay</button><button type="button">Explore Rooms</button></div>
                  <div className="vibe-hotel-booking-bar"><span>Check In</span><span>Check Out</span><span>Guests</span><span>Room</span><button type="button">Check Availability</button></div>
                </div>
              </article>

              <div className="vibe-suggestion-chips" aria-label="Suggestions">
                {suggestionChips.map((chip) => <button type="button" key={chip}>{chip}</button>)}
              </div>
            </section>

            <section className="vibe-input-shell" aria-label="Chat input">
              <div className="vibe-input-row">
                <span>Ask anything… (e.g., add a pricing section, make the hero bolder, add dark mode)</span>
                <button type="button">Send</button>
              </div>
              <div className="vibe-action-row">
                <button type="button">Improve Design</button>
                {actionChips.filter((chip) => chip !== "Improve Design").map((chip) => <button type="button" key={chip}>{chip}</button>)}
              </div>
            </section>
          </main>

          <aside className="vibe-right-rail" aria-label="Vibe intelligence rail">
            <section className="vibe-rail-card">
              <header><h3>Build Map</h3><button type="button" className="vibe-link-button">View Audit</button></header>
              <div className="vibe-step-line"><span className="is-done">Design</span><span className="is-active">Features</span><span>Data</span><span>Testing</span><span>Launch</span></div>
              {buildMapItems.map((item) => (
                <div className="vibe-rail-row" key={item.task}><span>{item.task}</span><strong>{item.status}</strong></div>
              ))}
            </section>

            <div className="vibe-rail-two-up">
              <section className="vibe-rail-card">
                <header><h3>Live Preview</h3><strong>Live</strong></header>
                <div className="vibe-mini-preview">Luxury hotel page preview</div>
              </section>
              <section className="vibe-rail-card">
                <header><h3>App Health</h3></header>
                <div className="vibe-health">92%<small>Excellent</small></div>
              </section>
            </div>

            <section className="vibe-rail-card">
              <h3>What’s Next</h3>
              <div className="vibe-next-grid">
                <button type="button">Connect Domain</button>
                <button type="button">Add Logo</button>
                <button type="button">Payment Setup</button>
                <button type="button">Email Notifications</button>
              </div>
            </section>

            <section className="vibe-rail-card">
              <h3>Recent Activity</h3>
              {recentActivity.map((event) => (
                <div key={event.item} className="vibe-rail-row"><span>{event.item}</span><small>{event.time}</small></div>
              ))}
            </section>

            <section className="vibe-rail-card vibe-launch-card">
              <h3>One-Click Launch</h3>
              <p>Everything looks good! Your app is ready to launch locally.</p>
              <button type="button">Launch My App</button>
            </section>
          </aside>
        </div>
      </div>
    </section>
  );
}
