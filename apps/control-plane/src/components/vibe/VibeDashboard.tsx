"use client";

import Link from "next/link";

import { actionChips, buildMapItems, recentActivity, recentProjects, suggestionChips, vibeSidebarNav } from "./vibeSeedData";

function LuxoraPreview({ compact = false }: { compact?: boolean }) {
  return (
    <div className={compact ? "luxora-preview luxora-preview--compact" : "luxora-preview"}>
      <div className="luxora-overlay" />
      <header className="luxora-nav">
        <strong>LUXORA</strong>
        <nav><span>Home</span><span>Rooms</span><span>Experiences</span><span>About Us</span><span>Contact</span></nav>
        <button type="button">Book Now</button>
      </header>
      <main className="luxora-hero-copy">
        <h2>Your Escape Awaits</h2>
        <p>Experience unparalleled luxury and unforgettable moments.</p>
        <div className="luxora-actions"><button type="button">Book Your Stay</button><button type="button">Explore Rooms</button></div>
      </main>
      {!compact ? (
        <div className="luxora-booking-bar">
          <span><small>Check In</small>May 24, 2024</span>
          <span><small>Check Out</small>May 27, 2024</span>
          <span><small>Guests</small>2 Adults, 1 Child</span>
          <span><small>Room</small>1 Suite</span>
          <button type="button">Check Availability</button>
        </div>
      ) : null}
    </div>
  );
}

export function VibeDashboard({ projectId }: { projectId: string }) {
  return (
    <section className="vibe-dashboard reference-ui" aria-label="Vibe dashboard" data-project-id={projectId}>
      <aside className="vibe-dashboard-sidebar" aria-label="Botomatic sidebar">
        <Link href="/" className="vibe-dashboard-brand">
          <span className="vibe-dashboard-brand-icon">⬢</span>
          <span><strong>Botomatic</strong><small>NEXUS</small></span>
        </Link>
        <Link href="/" className="vibe-dashboard-new-project">+ New Project</Link>
        <nav className="vibe-dashboard-nav" aria-label="Dashboard navigation">
          {vibeSidebarNav.map((item) => <button type="button" key={item} className={item === "Home" ? "is-active" : ""}>{item}</button>)}
        </nav>
        <div className="vibe-dashboard-card recent-projects-card">
          <h3>Recent Projects</h3>
          {recentProjects.map((project, index) => <div key={project.name} className="vibe-dashboard-row"><span className={`project-dot project-dot-${index}`} /> <span>{project.name}</span><small>{project.updated}</small></div>)}
          <button type="button" className="vibe-link-button">View all projects →</button>
        </div>
        <div className="vibe-dashboard-upgrade"><h3>Go Pro Anytime</h3><p>Unlock advanced features, team collaboration, and priority support.</p><button type="button">Upgrade to Pro</button></div>
        <div className="vibe-user-card"><span className="avatar">AJ</span><span><strong>Alex Johnson</strong><small>alex@example.com</small></span><small>⌄</small></div>
      </aside>

      <div className="vibe-dashboard-main">
        <header className="vibe-dashboard-header">
          <div className="vibe-title-block"><div className="vibe-sparkle">✦</div><div><h1>Vibe Mode</h1><p>Chat. Design. Build. Launch. All in one flow.</p></div></div>
          <div className="vibe-dashboard-device-switcher" role="tablist" aria-label="Device preview switcher"><button type="button" className="is-active">Desktop</button><button type="button">Tablet</button><button type="button">Mobile</button></div>
          <div className="vibe-dashboard-cta-group"><button type="button" className="icon-button">↶</button><button type="button" className="icon-button">?</button><button type="button" className="vibe-dashboard-share">Share</button><button type="button" className="vibe-dashboard-launch">Launch App</button></div>
        </header>

        <div className="vibe-dashboard-layout" data-testid="vibe-dashboard-layout">
          <main className="vibe-center-canvas">
            <section className="vibe-chat-timeline" data-testid="vibe-chat-timeline">
              <div className="vibe-msg vibe-msg-user">Build me a modern booking website for a luxury hotel with a beautiful landing page.<small>10:24 AM</small></div>
              <div className="vibe-msg vibe-msg-agent"><p>I&apos;ve got you! I&apos;ll create a luxury hotel booking website with a stunning landing page.</p><div className="vibe-msg-pills"><span>✓ Understanding your idea</span><span>✓ Designing the UI</span><span>✓ Planning the features</span><span>◔ Building it all together</span></div><small>10:24 AM</small></div>
              <section className="preview-stage-card"><p>Here&apos;s your live design. You can edit anything by clicking on it or tell me what to change.</p><div className="preview-toolbar"><button type="button">✦ Edit</button><span>Desktop · Tablet · Mobile</span><span>Version 3 ⌄</span></div><LuxoraPreview /></section>
              <div className="vibe-suggestion-chips" aria-label="Suggestions"><span>Try saying:</span>{suggestionChips.map((chip) => <button type="button" key={chip}>{chip}</button>)}</div>
            </section>
            <section className="vibe-input-shell" aria-label="Chat input" data-testid="vibe-input-shell"><form className="vibe-input-row"><input placeholder="Ask anything… (e.g., add a pricing section, make the hero bolder, add dark mode)" aria-label="Vibe orchestration prompt" /><button type="button">➜</button></form><div className="vibe-action-row">{actionChips.map((chip) => <button type="button" key={chip}>{chip}</button>)}</div></section>
          </main>

          <aside className="vibe-right-rail" aria-label="Vibe intelligence rail" data-testid="vibe-right-rail">
            <section className="vibe-rail-card build-map-card" aria-label="Build Map status"><header><div><h3>Build Map</h3><p>Auto-updates as we build your app</p></div><button type="button">View Audit →</button></header><div className="build-steps"><span className="done">Design<small>Complete</small></span><span className="active">Features<small>In Progress</small></span><span>Data<small>Pending</small></span><span>Testing<small>Pending</small></span><span>Launch<small>Pending</small></span></div><div className="build-task-list">{buildMapItems.map((item) => <div key={item.task} className={`build-task ${item.status.toLowerCase().replace(/ /g, "-")}`}><span>{item.task}</span><strong>{item.status}</strong></div>)}</div></section>
            <div className="vibe-rail-two-up"><section className="vibe-rail-card live-preview-card"><header><h3>Live Preview</h3><span className="live-dot">Live</span></header><LuxoraPreview compact /><div className="preview-device-row"><span>▣</span><span>☁</span><span>□</span><span>⛶</span></div></section><section className="vibe-rail-card app-health-card"><header><h3>App Health</h3><span>•••</span></header><div className="vibe-health">92%<small>Excellent</small></div>{["Performance", "Security", "SEO", "Best Practices"].map((item) => <div className="vibe-rail-row" key={item}><span>{item}</span><strong>Good</strong></div>)}<button type="button" className="vibe-link-button">View full report →</button></section></div>
            <section className="vibe-rail-card whats-next-card"><h3>What&apos;s Next</h3><p>Recommended next actions to complete your app</p><div className="vibe-next-grid"><button type="button">Connect Domain<small>Setup →</small></button><button type="button">Add Logo<small>Upload →</small></button><button type="button">Payment Setup<small>Connect →</small></button><button type="button">Email Notifications<small>Enable →</small></button></div></section>
            <div className="vibe-rail-two-up bottom-rail"><section className="vibe-rail-card recent-activity-card"><header><h3>Recent Activity</h3></header>{recentActivity.map((item) => <div key={item.item} className="vibe-rail-row"><span>{item.item}</span><small>{item.time}</small></div>)}<button type="button" className="vibe-link-button">View all activity →</button></section><section className="vibe-rail-card vibe-launch-card"><h3>One-Click Launch</h3><p>Everything looks good. Your app is ready to launch locally.</p><button type="button">Launch My App</button><div className="launch-actions"><span>Preview</span><span>Test</span><span>Deploy</span></div></section></div>
          </aside>
        </div>
      </div>
    </section>
  );
}
