"use client";

import Link from "next/link";
import type { ReactNode } from "react";

type BuilderWorkspace = "vibe" | "pro";
type PanelSource = "live" | "validator" | "proof" | "static-preview" | "not-implemented";
type StatusTone = "verified" | "running" | "blocked" | "partial" | "unverified" | "planned";

type BuilderShellProps = {
  projectId: string;
  workspace: BuilderWorkspace;
  children: ReactNode;
  rightRail?: ReactNode;
};

const sourceLabels: Record<PanelSource, string> = {
  live: "Live data",
  validator: "Validator-backed",
  proof: "Proof-backed",
  "static-preview": "Static preview",
  "not-implemented": "Not implemented",
};

const toneLabels: Record<StatusTone, string> = {
  verified: "Verified",
  running: "Running",
  blocked: "Blocked",
  partial: "Partial",
  unverified: "Unverified",
  planned: "Planned",
};

export function DataSourceBadge({ source }: { source: PanelSource }) {
  return <span className={`northstar-source-badge is-${source}`}>{sourceLabels[source]}</span>;
}

export function ProofBackedStatus({ tone, label, source }: { tone: StatusTone; label?: string; source: PanelSource }) {
  return (
    <span className={`northstar-status is-${tone}`}>
      <span className="northstar-status-dot" aria-hidden />
      {label || toneLabels[tone]}
      <DataSourceBadge source={source} />
    </span>
  );
}

export function WorkspaceCard({ title, eyebrow, source, children, action }: { title: string; eyebrow?: string; source: PanelSource; children: ReactNode; action?: ReactNode }) {
  return (
    <section className="northstar-card">
      <header className="northstar-card-header">
        <div>
          {eyebrow ? <div className="northstar-eyebrow">{eyebrow}</div> : null}
          <h3>{title}</h3>
        </div>
        <div className="northstar-card-actions">
          <DataSourceBadge source={source} />
          {action}
        </div>
      </header>
      <div className="northstar-card-body">{children}</div>
    </section>
  );
}

function DisabledNavItem({ children }: { children: ReactNode }) {
  return <span className="northstar-nav-disabled" aria-disabled="true">{children}</span>;
}

function ChatInputBar({ placeholder = "Ask Botomatic anything…", compact = false }: { placeholder?: string; compact?: boolean }) {
  return (
    <div className={compact ? "vibe-command-bar vibe-command-bar--compact" : "vibe-command-bar"}>
      <span>{placeholder}</span>
      <div>
        <button type="button">Attach</button>
        <button type="button" aria-label="Switch chat input to voice">Voice</button>
        <button type="button" className="northstar-primary-button">Send</button>
      </div>
    </div>
  );
}

export function NorthStarBuilderShell({ projectId, workspace, children, rightRail }: BuilderShellProps) {
  const isVibe = workspace === "vibe";
  const primaryHref = isVibe ? `/projects/${projectId}/advanced` : `/projects/${projectId}/vibe`;
  const primaryLabel = isVibe ? "Open Pro Builder" : "Open Vibe Builder";

  return (
    <section className={`northstar-shell northstar-shell--${workspace}`}>
      <aside className="northstar-global-sidebar" aria-label="Botomatic navigation">
        <Link href="/" className="northstar-brand" aria-label="Botomatic home">
          <span className="northstar-brand-mark">⬡</span>
          <span><strong>Botomatic</strong><small>Universal Builder</small></span>
        </Link>
        <Link href="/" className="northstar-new-project">+ New Project</Link>
        <nav className="northstar-nav" aria-label="Primary builder navigation">
          <Link href={`/projects/${projectId}/vibe`} className={isVibe ? "is-active" : ""}>Home</Link>
          <Link href={`/projects/${projectId}/advanced`} className={!isVibe ? "is-active" : ""}>Pro Control</Link>
          <DisabledNavItem>Projects</DisabledNavItem>
          <DisabledNavItem>Templates</DisabledNavItem>
          <DisabledNavItem>Design Studio</DisabledNavItem>
          <DisabledNavItem>Brand Kit</DisabledNavItem>
          <DisabledNavItem>Launch</DisabledNavItem>
          <DisabledNavItem>Learn</DisabledNavItem>
        </nav>
        <div className="northstar-sidebar-note">
          <div>Chat and voice stay in control.</div>
          <small>Voice only changes input capture. Commands follow the same chat path.</small>
        </div>
      </aside>
      <div className="northstar-main">
        <header className="northstar-workspace-topbar">
          <div>
            <div className="northstar-eyebrow">{isVibe ? "Vibe Builder" : "Pro Builder"}</div>
            <h2>{isVibe ? "Chat. Design. Build. Launch." : "Technical. Powerful. Complete control."}</h2>
            <p>{isVibe ? "Describe the app, refine the preview, approve proof-backed next steps." : "Inspect repo state, validators, runtime, services, proofs, and deployment gates."}</p>
          </div>
          <div className="northstar-topbar-actions" aria-label="Workspace actions">
            <Link href={primaryHref} className="northstar-ghost-action">{primaryLabel}</Link>
            <Link href="/" className="northstar-primary-action">Start New Build</Link>
          </div>
        </header>
        <div className="northstar-content-grid">
          <main className="northstar-content">{children}</main>
          {rightRail ? <aside className="northstar-right-rail">{rightRail}</aside> : null}
        </div>
      </div>
    </section>
  );
}

export function VibeBuilderSkeleton({ projectId }: { projectId: string }) {
  return (
    <NorthStarBuilderShell projectId={projectId} workspace="vibe" rightRail={<VibeBuildRail />}>
      <div className="vibe-builder-grid vibe-builder-grid--hero">
        <section className="vibe-chat-panel vibe-chat-panel--conversation">
          <div className="vibe-message-list" aria-label="Static preview chat transcript">
            <div className="vibe-message is-user">Build me a modern booking website for a luxury hotel with a beautiful landing page.</div>
            <div className="vibe-message is-bot">
              I can build the commercial contract and preview. I need proof-backed decisions for payments, cancellation policy, and admin roles before launch.
              <div className="vibe-progress-pills" aria-label="Build progress preview">
                <span>Idea understood</span><span>Design direction</span><span>Critical gaps</span><span>Build contract</span>
              </div>
            </div>
          </div>
          <GeneratedPreviewCard />
          <div className="vibe-action-chips" aria-label="Natural language actions">
            {['Make it more premium', 'Add booking flow', 'Improve mobile view', 'Add testimonials', 'Run proof'].map((item) => <button type="button" key={item}>{item}</button>)}
          </div>
          <ChatInputBar placeholder="Ask anything… e.g. add a pricing section, improve the hero, connect payments" />
        </section>
      </div>
    </NorthStarBuilderShell>
  );
}

function GeneratedPreviewCard() {
  return (
    <WorkspaceCard title="Live generated app preview" eyebrow="Static visual target" source="static-preview" action={<ProofBackedStatus tone="unverified" source="static-preview" label="Preview only" />}>
      <div className="generated-preview-card generated-preview-card--large">
        <div className="generated-preview-toolbar"><span>Edit</span><span>Desktop · Tablet · Mobile</span><span>Version 3</span></div>
        <div className="generated-preview-hero">
          <span>LUXORA</span>
          <h2>Your Escape Awaits</h2>
          <p>Experience unparalleled luxury and unforgettable moments.</p>
          <div className="generated-preview-actions"><button type="button">Book Your Stay</button><button type="button">Explore Rooms</button></div>
          <div className="generated-booking-bar"><span>Check In<br />May 24</span><span>Check Out<br />May 27</span><span>Guests<br />2 Adults</span><span>Room<br />1 Suite</span><button type="button">Check Availability</button></div>
        </div>
      </div>
    </WorkspaceCard>
  );
}

function VibeBuildRail() {
  return (
    <>
      <WorkspaceCard title="Build Map" eyebrow="Auto-updates as proof lands" source="not-implemented">
        <div className="build-map-steps"><span className="is-done">Design</span><span className="is-active">Features</span><span>Data</span><span>Testing</span><span>Launch</span></div>
        <div className="northstar-metric-row"><span>Create homepage</span><strong>Preview</strong></div>
        <div className="northstar-metric-row"><span>Add booking flow</span><strong>Pending proof</strong></div>
        <div className="northstar-metric-row"><span>Payment setup</span><strong>Blocked</strong></div>
      </WorkspaceCard>
      <WorkspaceCard title="App Health" eyebrow="Truthful readiness" source="not-implemented">
        <div className="app-health-ring">92<span>%</span></div>
        <ProofBackedStatus tone="planned" source="not-implemented" label="Health wiring planned" />
      </WorkspaceCard>
      <WorkspaceCard title="What’s Next" eyebrow="Recommended actions" source="not-implemented">
        <div className="next-action-grid"><button type="button">Answer blockers</button><button type="button">Approve contract</button><button type="button">Connect payments</button><button type="button">Run tests</button></div>
      </WorkspaceCard>
      <WorkspaceCard title="Launch Readiness" eyebrow="Proof gate" source="not-implemented">
        <ProofBackedStatus tone="blocked" source="not-implemented" label="Launch proof not wired" />
      </WorkspaceCard>
    </>
  );
}

export function ProBuilderSkeleton({ projectId }: { projectId: string }) {
  return (
    <NorthStarBuilderShell projectId={projectId} workspace="pro" rightRail={<ProControlRail />}>
      <div className="pro-builder-grid pro-builder-grid--command">
        <WorkspaceCard title="Build Pipeline" eyebrow="Execution" source="static-preview"><div className="northstar-stepper">{['Spec', 'Design', 'Data', 'Logic', 'Tests', 'Launch', 'Deploy'].map((step, index) => <div className="northstar-step" key={step}><span>{index + 1}</span><strong>{step}</strong><small>{index < 3 ? 'Preview' : 'Waiting'}</small></div>)}</div></WorkspaceCard>
        <WorkspaceCard title="System Health" eyebrow="Proof-aware" source="not-implemented"><div className="system-health-grid"><div className="app-health-ring">92<span>%</span></div><div><div className="northstar-metric-row"><span>Performance</span><strong>Pending</strong></div><div className="northstar-metric-row"><span>Security</span><strong>Pending</strong></div><div className="northstar-metric-row"><span>Code Quality</span><strong>Pending</strong></div></div></div></WorkspaceCard>
        <WorkspaceCard title="Code Changes" eyebrow="Repository" source="not-implemented"><div className="code-diff-shell"><div className="code-tree"><strong>apps/web</strong><span>app/page.tsx</span><span>components/Hero.tsx</span><span>lib/api.ts</span></div><pre>{`- <Hero title="Luxury stays" />\n+ <Hero title="Your Escape Awaits" />`}</pre></div></WorkspaceCard>
        <WorkspaceCard title="Live Application" eyebrow="Runtime preview" source="not-implemented"><div className="pro-preview-box"><GeneratedPreviewMini /></div></WorkspaceCard>
        <WorkspaceCard title="Test Results" eyebrow="Validators" source="validator"><div className="test-summary"><strong>Pending wiring</strong><span>Unit · Integration · E2E · API · Security · No-placeholder</span></div></WorkspaceCard>
        <WorkspaceCard title="Terminal + Logs" eyebrow="Runtime" source="not-implemented"><pre className="terminal-preview">$ npm run build\n$ npm run validate:all\n$ proof pending...</pre></WorkspaceCard>
        <WorkspaceCard title="AI Copilot" eyebrow="Same chat command path" source="static-preview"><p className="northstar-muted">Use keyboard or voice input below. Both become the same canonical command request.</p><ChatInputBar compact placeholder="Ask Botomatic to repair, test, explain, harden, or deploy…" /></WorkspaceCard>
      </div>
    </NorthStarBuilderShell>
  );
}

function GeneratedPreviewMini() {
  return <div className="generated-preview-mini"><span>LUXORA</span><strong>Your Escape Awaits</strong><small>Preview reserved for generated artifacts.</small></div>;
}

function ProControlRail() {
  return (
    <>
      <WorkspaceCard title="Services" eyebrow="Runtime" source="not-implemented"><div className="service-list">{['Next.js App', 'API Server', 'PostgreSQL', 'Redis', 'Storage', 'Stripe'].map((service) => <div key={service}><span>{service}</span><strong>Pending</strong></div>)}</div></WorkspaceCard>
      <WorkspaceCard title="Database Schema" eyebrow="Data" source="not-implemented"><div className="service-list"><div><span>users</span><strong>planned</strong></div><div><span>bookings</span><strong>planned</strong></div><div><span>payments</span><strong>blocked</strong></div></div></WorkspaceCard>
      <WorkspaceCard title="Proof Status" eyebrow="Audit" source="not-implemented"><p className="northstar-muted">Validator, proof, and launch evidence will be wired here.</p></WorkspaceCard>
    </>
  );
}
