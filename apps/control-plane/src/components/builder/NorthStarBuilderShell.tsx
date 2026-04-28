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

function NorthStarGlobalStyles() {
  return (
    <style jsx global>{`
      .northstar-shell {
        width: 100vw !important;
        height: 100dvh !important;
        min-height: 0 !important;
        padding: 16px !important;
        display: grid !important;
        grid-template-columns: 220px minmax(0, 1fr) !important;
        gap: 16px !important;
        overflow: hidden !important;
        background:
          radial-gradient(circle at 84% 8%, rgba(124, 77, 255, 0.16), transparent 34%),
          radial-gradient(circle at 10% 0%, rgba(90, 54, 220, 0.12), transparent 30%),
          linear-gradient(180deg, #fbfaff 0%, #f0edff 100%) !important;
      }

      .northstar-global-sidebar {
        display: flex !important;
        min-height: 0 !important;
        height: 100% !important;
        overflow: hidden !important;
        border-radius: 24px !important;
      }

      .northstar-main {
        height: 100% !important;
        min-height: 0 !important;
        overflow: hidden !important;
        display: grid !important;
        grid-template-rows: auto minmax(0, 1fr) !important;
        gap: 14px !important;
      }

      .northstar-workspace-topbar {
        min-height: 92px !important;
        padding: 14px 18px !important;
        border-radius: 24px !important;
        flex-shrink: 0 !important;
      }

      .northstar-workspace-topbar h2 {
        font-size: 28px !important;
        line-height: 1.05 !important;
      }

      .northstar-content-grid {
        height: 100% !important;
        min-height: 0 !important;
        overflow: hidden !important;
        display: grid !important;
        grid-template-columns: minmax(0, 1fr) 340px !important;
        gap: 14px !important;
      }

      .northstar-content {
        min-height: 0 !important;
        overflow: hidden !important;
        display: grid !important;
      }

      .northstar-right-rail {
        min-height: 0 !important;
        overflow-y: auto !important;
        overflow-x: hidden !important;
        display: grid !important;
        align-content: start !important;
        gap: 12px !important;
        padding-right: 2px !important;
      }

      .vibe-builder-grid,
      .pro-builder-grid {
        height: 100% !important;
        min-height: 0 !important;
        overflow: hidden !important;
      }

      .northstar-shell--vibe .vibe-builder-grid {
        display: grid !important;
        grid-template-columns: minmax(0, 1fr) !important;
      }

      .vibe-chat-panel {
        height: 100% !important;
        min-height: 0 !important;
        padding: 18px !important;
        display: grid !important;
        grid-template-rows: auto minmax(0, 1fr) auto auto !important;
        gap: 12px !important;
        overflow: hidden !important;
        border-radius: 26px !important;
      }

      .vibe-message-list {
        display: grid !important;
        gap: 10px !important;
        margin: 0 !important;
        flex: none !important;
      }

      .vibe-message {
        max-width: 74% !important;
        padding: 12px 14px !important;
        font-size: 13px !important;
        line-height: 1.35 !important;
      }

      .vibe-progress-pills {
        margin-top: 10px !important;
        display: flex !important;
        gap: 8px !important;
        flex-wrap: wrap !important;
      }

      .vibe-progress-pills span {
        border-radius: 999px !important;
        padding: 6px 9px !important;
        border: 1px solid rgba(116, 88, 220, 0.14) !important;
        background: #fff !important;
        color: #5c4d78 !important;
        font-size: 11px !important;
      }

      .northstar-card {
        min-height: 0 !important;
      }

      .vibe-chat-panel > .northstar-card {
        min-height: 0 !important;
        overflow: hidden !important;
      }

      .vibe-chat-panel > .northstar-card .northstar-card-body {
        min-height: 0 !important;
        overflow: hidden !important;
        padding: 12px 14px 14px !important;
      }

      .generated-preview-card {
        min-height: 0 !important;
        height: 100% !important;
        padding: 10px !important;
        overflow: hidden !important;
      }

      .generated-preview-card--large {
        min-height: 0 !important;
      }

      .generated-preview-hero {
        min-height: 0 !important;
        height: calc(100% - 34px) !important;
        padding: 24px !important;
        justify-content: center !important;
        overflow: hidden !important;
      }

      .generated-preview-hero h2 {
        font-size: clamp(34px, 4vw, 54px) !important;
      }

      .generated-booking-bar,
      .generated-preview-actions {
        display: flex !important;
        gap: 10px !important;
        flex-wrap: wrap !important;
        margin-top: 14px !important;
      }

      .generated-booking-bar {
        align-items: center !important;
        border-radius: 16px !important;
        background: rgba(255,255,255,0.94) !important;
        color: #241a42 !important;
        padding: 10px !important;
        width: fit-content !important;
        max-width: 100% !important;
      }

      .generated-booking-bar span {
        min-width: 86px !important;
        color: #615276 !important;
        opacity: 1 !important;
        text-transform: none !important;
        letter-spacing: 0 !important;
      }

      .vibe-action-chips {
        flex-shrink: 0 !important;
      }

      .vibe-command-bar {
        margin-top: 0 !important;
        flex-shrink: 0 !important;
      }

      .build-map-steps {
        display: grid !important;
        grid-template-columns: repeat(5, minmax(0, 1fr)) !important;
        gap: 6px !important;
        margin-bottom: 10px !important;
      }

      .build-map-steps span {
        border-radius: 999px !important;
        border: 1px solid rgba(116, 88, 220, 0.16) !important;
        padding: 6px 7px !important;
        text-align: center !important;
        font-size: 10px !important;
        color: #75698f !important;
      }

      .build-map-steps span.is-done,
      .build-map-steps span.is-active {
        color: #fff !important;
        background: linear-gradient(135deg, #7c4dff, #5b2be0) !important;
      }

      .app-health-ring {
        width: 96px !important;
        height: 96px !important;
        margin: 0 auto 12px !important;
        border-radius: 999px !important;
        display: grid !important;
        place-items: center !important;
        font-weight: 800 !important;
        font-size: 28px !important;
        color: #1b7d52 !important;
        background:
          radial-gradient(circle at center, #fff 58%, transparent 59%),
          conic-gradient(#29a56f 0 92%, #efeafc 92% 100%) !important;
      }

      .app-health-ring span {
        font-size: 13px !important;
      }

      .next-action-grid,
      .service-list {
        display: grid !important;
        gap: 8px !important;
      }

      .next-action-grid {
        grid-template-columns: repeat(2, minmax(0, 1fr)) !important;
      }

      .next-action-grid button {
        padding: 8px !important;
        font-size: 11px !important;
      }

      .pro-builder-grid {
        display: grid !important;
        grid-template-columns: repeat(2, minmax(0, 1fr)) !important;
        gap: 12px !important;
        overflow-y: auto !important;
        padding-right: 2px !important;
      }

      .northstar-stepper {
        grid-template-columns: repeat(7, minmax(90px, 1fr)) !important;
      }

      .code-diff-shell,
      .system-health-grid {
        display: grid !important;
        grid-template-columns: 170px minmax(0, 1fr) !important;
        gap: 12px !important;
      }

      .code-diff-shell pre,
      .terminal-preview {
        margin: 0 !important;
        border-radius: 14px !important;
        background: #12101d !important;
        color: #e9e4ff !important;
        padding: 14px !important;
        overflow: auto !important;
      }

      .service-list > div,
      .test-summary,
      .pro-preview-box,
      .generated-preview-mini {
        border: 1px solid rgba(116, 88, 220, 0.12) !important;
        border-radius: 14px !important;
        padding: 10px !important;
        background: #fbf9ff !important;
        display: flex !important;
        justify-content: space-between !important;
        gap: 10px !important;
      }

      .northstar-nav-disabled {
        border-radius: 12px !important;
        padding: 9px 10px !important;
        color: #9b90b4 !important;
        cursor: not-allowed !important;
        font-weight: var(--font-weight-medium) !important;
      }

      @media (max-width: 1240px) {
        .northstar-shell {
          grid-template-columns: 1fr !important;
          overflow-y: auto !important;
        }
        .northstar-global-sidebar {
          display: none !important;
        }
        .northstar-content-grid {
          grid-template-columns: 1fr !important;
          overflow: visible !important;
        }
        .northstar-content,
        .northstar-right-rail {
          overflow: visible !important;
        }
      }
    `}</style>
  );
}

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
      <NorthStarGlobalStyles />
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
