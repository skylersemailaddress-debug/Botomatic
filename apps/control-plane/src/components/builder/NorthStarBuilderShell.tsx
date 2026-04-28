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

export function WorkspaceCard({
  title,
  eyebrow,
  source,
  children,
  action,
}: {
  title: string;
  eyebrow?: string;
  source: PanelSource;
  children: ReactNode;
  action?: ReactNode;
}) {
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
  return (
    <span className="northstar-nav-disabled" aria-disabled="true">
      {children}
    </span>
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
          <span>
            <strong>Botomatic</strong>
            <small>Universal Builder</small>
          </span>
        </Link>
        <Link href="/" className="northstar-new-project">+ New Project</Link>
        <nav className="northstar-nav" aria-label="Primary builder navigation">
          <Link href={`/projects/${projectId}/vibe`} className={isVibe ? "is-active" : ""}>Build Chat</Link>
          <Link href={`/projects/${projectId}/advanced`} className={!isVibe ? "is-active" : ""}>Pro Control</Link>
          <DisabledNavItem>Templates</DisabledNavItem>
          <DisabledNavItem>Design Studio</DisabledNavItem>
          <DisabledNavItem>Launch</DisabledNavItem>
          <DisabledNavItem>Learn</DisabledNavItem>
        </nav>
        <div className="northstar-sidebar-note">
          <div>Chat and voice stay in control.</div>
          <small>No launch claim is shown without proof.</small>
        </div>
      </aside>

      <div className="northstar-main">
        <header className="northstar-workspace-topbar">
          <div>
            <div className="northstar-eyebrow">{isVibe ? "Creation cockpit" : "Technical command center"}</div>
            <h2>{isVibe ? "Vibe Builder" : "Pro Builder"}</h2>
            <p>{isVibe ? "Chat, voice, preview, spec, and launch readiness." : "Inspect, validate, repair, deploy, and control the full build."}</p>
          </div>
          <div className="northstar-topbar-actions" aria-label="Workspace actions">
            <Link href={primaryHref} className="northstar-ghost-action">{primaryLabel}</Link>
            <button type="button" className="northstar-voice-action" aria-label="Voice command placeholder">Voice</button>
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
      <div className="vibe-builder-grid">
        <section className="vibe-chat-panel">
          <div className="northstar-eyebrow">Chat-driven builder</div>
          <h1>Tell Botomatic what to build.</h1>
          <p className="northstar-muted">Describe the product, upload a repo or PDF, or ask Botomatic to decide safe gaps. Critical choices remain explicit.</p>
          <div className="vibe-message-list" aria-label="Static preview chat transcript">
            <div className="vibe-message is-user">Build a polished booking platform for a premium service business.</div>
            <div className="vibe-message is-bot">I can shape that into a commercial build contract. I need to verify payments, cancellation policy, and admin roles before execution.</div>
          </div>
          <div className="vibe-command-bar">
            <span>Ask Botomatic anything…</span>
            <div>
              <button type="button">Attach</button>
              <button type="button">Voice</button>
              <button type="button" className="northstar-primary-button">Send</button>
            </div>
          </div>
          <div className="vibe-action-chips" aria-label="Natural language actions">
            {['Improve design', 'Add feature', 'Fix this repo', 'Decide safe gaps', 'Run proof'].map((item) => <button type="button" key={item}>{item}</button>)}
          </div>
        </section>

        <WorkspaceCard title="Generated app preview" eyebrow="Visual target" source="static-preview">
          <div className="generated-preview-card">
            <div className="generated-preview-toolbar">
              <span>Desktop preview</span>
              <ProofBackedStatus tone="unverified" source="static-preview" label="Preview only" />
            </div>
            <div className="generated-preview-hero">
              <span>Luxury booking site</span>
              <h2>Premium, responsive, launch-gated experience</h2>
              <p>Design surface reserved for generated app output. Future passes wire this to real preview artifacts.</p>
            </div>
          </div>
        </WorkspaceCard>
      </div>
    </NorthStarBuilderShell>
  );
}

function VibeBuildRail() {
  return (
    <>
      <WorkspaceCard title="Build Contract" eyebrow="Spec gate" source="not-implemented">
        <div className="northstar-metric-row"><span>Critical completeness</span><strong>Pending</strong></div>
        <div className="northstar-metric-row"><span>Open critical questions</span><strong>Not wired</strong></div>
        <ProofBackedStatus tone="planned" source="not-implemented" label="Contract panel planned" />
      </WorkspaceCard>
      <WorkspaceCard title="Assumptions + recommendations" eyebrow="Product brain" source="not-implemented">
        <p className="northstar-muted">Will show safe assumptions, approval-required assumptions, and commercial recommendations.</p>
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
      <div className="pro-builder-grid">
        <WorkspaceCard title="Build pipeline" eyebrow="Execution" source="static-preview">
          <div className="northstar-stepper">
            {['Spec', 'Design', 'Data', 'Logic', 'Tests', 'Launch'].map((step, index) => (
              <div className="northstar-step" key={step}>
                <span>{index + 1}</span>
                <strong>{step}</strong>
                <small>{index < 2 ? 'Preview' : 'Pending wiring'}</small>
              </div>
            ))}
          </div>
        </WorkspaceCard>
        <WorkspaceCard title="Code changes" eyebrow="Repository" source="not-implemented">
          <div className="northstar-code-card">
            <div>File tree and diff viewer will connect to Git state in the data-wiring pass.</div>
            <ProofBackedStatus tone="planned" source="not-implemented" />
          </div>
        </WorkspaceCard>
        <WorkspaceCard title="Live application" eyebrow="Preview/runtime" source="not-implemented">
          <p className="northstar-muted">Runtime preview status will be wired to local dashboard and route smoke proof.</p>
        </WorkspaceCard>
        <WorkspaceCard title="Tests + validators" eyebrow="Proof" source="validator">
          <p className="northstar-muted">Validator-backed status will replace static shell indicators in a later PR.</p>
        </WorkspaceCard>
      </div>
    </NorthStarBuilderShell>
  );
}

function ProControlRail() {
  return (
    <>
      <WorkspaceCard title="System health" eyebrow="Proof-aware" source="not-implemented">
        <ProofBackedStatus tone="planned" source="not-implemented" label="Health wiring planned" />
      </WorkspaceCard>
      <WorkspaceCard title="Services" eyebrow="Runtime" source="not-implemented">
        <p className="northstar-muted">API, UI, database, workers, and domain services will render here.</p>
      </WorkspaceCard>
      <WorkspaceCard title="AI Copilot" eyebrow="Chat control" source="static-preview">
        <p className="northstar-muted">Ask for repairs, tests, architecture review, or proof explanation.</p>
      </WorkspaceCard>
    </>
  );
}
