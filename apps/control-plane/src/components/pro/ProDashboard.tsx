import Link from "next/link";

import { LiveApplicationPanel } from "@/components/runtime/RuntimePreviewPanel";
import { getProDashboardData } from "@/services/proDashboard";
import { hasItems, panelTruth } from "@/services/panelTruth";

import { proRecentProjects, proSecondaryNav, proSidebarNav } from "./proSeedData";

type PipelineStage = { label?: string; status?: string; updatedAt?: string };
type ServiceStatus = { name: string; status: string };
type SchemaRow = { table: string; rows?: number };
type TestStatus = { total?: number; passed?: number; failed?: number; skipped?: number };
type TestEvidence = { summary?: string; artifactPath?: string };
type Commit = { message: string; author?: string; time?: string };
type CodeChange = { path?: string; summary?: string };
type CopilotActivity = { message?: string; timestamp?: string };

function TruthBadge({ label }: { label: string }) {
  return <small className="northstar-source-badge is-not-implemented">{label}</small>;
}

function BuildPipelinePanel({ pipeline }: { pipeline: PipelineStage[] }) {
  const hasPipeline = hasItems(pipeline);

  return (
    <section className="pro-panel" data-testid="pro-panel">
      <header>
        <h2>Build Pipeline</h2>
        <TruthBadge label={hasPipeline ? "Live data" : "No execution run yet"} />
      </header>
      <div className="pro-pipeline">
        {hasPipeline ? (
          pipeline.map((step, index) => (
            <div className="pro-pipeline-step" key={`${step.label || "stage"}-${index}`}>
              <div className="pro-dot">○</div>
              <strong>{step.label || `Stage ${index + 1}`}</strong>
              <small>{step.status || "Unverified"}</small>
              <small>{step.updatedAt || ""}</small>
            </div>
          ))
        ) : (
          <small>No build started</small>
        )}
      </div>
    </section>
  );
}

function SystemHealthPanel({ healthStatus, projectStatus, latestRunStatus }: { healthStatus?: string; projectStatus?: string; latestRunStatus?: string }) {
  const healthy = healthStatus === "ok";

  return (
    <section className="pro-panel" data-testid="pro-panel">
      <header>
        <h2>System Health</h2>
      </header>
      <div className="pro-health">
        <div className="pro-health-ring">
          {healthy ? "OK" : "--"}
          <small>{healthy ? "Live data" : "Health check not run"}</small>
        </div>
        <div>
          <div className="pro-health-row"><span>API health</span><strong>{healthy ? "Connected" : "Not Connected"}</strong></div>
          <div className="pro-health-row"><span>Project status</span><strong>{projectStatus || "Backend state unavailable"}</strong></div>
          <div className="pro-health-row"><span>Latest run</span><strong>{latestRunStatus || "Unverified"}</strong></div>
        </div>
      </div>
    </section>
  );
}

function CodeChangesPanel({ changes }: { changes: CodeChange[] }) {
  return (
    <section className="pro-panel" data-testid="pro-panel">
      <header>
        <h2>Code Changes</h2>
      </header>
      {hasItems(changes) ? (
        changes.map((change, index) => (
          <div className="pro-service-row" key={`${change.path || "change"}-${index}`}>
            <span>{change.path || `File ${index + 1}`}</span>
            <small>{change.summary || panelTruth.unknown}</small>
          </div>
        ))
      ) : (
        <div className="pro-service-row">
          <span>{"No code changes available"}</span>
          <strong>{"Repository diff not connected"}</strong>
        </div>
      )}
    </section>
  );
}

function ServicesPanel({ services }: { services: ServiceStatus[] }) {
  const hasServices = hasItems(services);
  return (
    <section className="pro-panel" data-testid="pro-panel">
      <header><h2>Services</h2></header>
      <small>{hasServices ? "Live data" : "Service health not connected"}</small>
      {hasServices ? services.map((service) => (
        <div className="pro-service-row" key={service.name}><span>{service.name}</span><strong>{service.status || panelTruth.unknown}</strong></div>
      )) : <div className="pro-service-row"><span>Services</span><strong>{"Not Connected"}</strong></div>}
    </section>
  );
}

function DatabasePanel({ schema }: { schema: SchemaRow[] }) {
  return <section className="pro-panel" data-testid="pro-panel"><header><h2>Database Schema</h2></header>{hasItems(schema) ? schema.map((item) => <div className="pro-service-row" key={item.table}><span>{item.table}</span><small>{item.rows ?? "Unknown rows"}</small></div>) : <div className="pro-service-row"><span>Schema</span><strong>{"Database not connected"}</strong></div>}</section>;
}

function hasStructuredTests(tests?: TestStatus): tests is TestStatus {
  if (!tests) return false;
  return typeof tests.total === "number" || typeof tests.passed === "number" || typeof tests.failed === "number" || typeof tests.skipped === "number";
}

function TestResultsPanel({ tests, evidence }: { tests?: TestStatus; evidence?: TestEvidence }) {
  return <section className="pro-panel" data-testid="pro-panel"><header><h2>Test Results</h2></header>{hasStructuredTests(tests) ? <><div className="pro-test-total">{tests.total ?? 0} <small>Total Tests</small></div><div className="pro-health-row"><span>Passed</span><strong>{tests.passed ?? 0}</strong></div><div className="pro-health-row"><span>Failed</span><strong>{tests.failed ?? 0}</strong></div><div className="pro-health-row"><span>Skipped</span><strong>{tests.skipped ?? 0}</strong></div></> : evidence ? <><div className="pro-health-row"><span>Status</span><strong>Test evidence available</strong></div><div className="pro-health-row"><span>Evidence</span><strong>{evidence.summary || evidence.artifactPath || panelTruth.unknown}</strong></div></> : <div className="pro-health-row"><span>Status</span><strong>{"No test run yet"}</strong></div>}</section>;
}

const TerminalPanel = ({ logs }: { logs: string[] }) => <section className="pro-panel" data-testid="pro-panel"><header><h2>Terminal</h2></header>{hasItems(logs) ? <pre className="pro-terminal">{logs.join("\n")}</pre> : <pre className="pro-terminal">{"No terminal logs yet"}</pre>}</section>;

const CopilotPanel = ({ activity }: { activity: CopilotActivity[] }) => <section className="pro-panel" data-testid="pro-panel"><header><h2>AI Copilot</h2></header>{hasItems(activity) ? activity.map((item, index) => <div className="pro-commit-row" key={`${item.timestamp || "activity"}-${index}`}><span>{item.message || panelTruth.unknown}</span><small>{item.timestamp || ""}</small></div>) : <div className="pro-commit-row"><span>{"No Copilot activity yet"}</span></div>}</section>;

const RecentCommitsPanel = ({ commits }: { commits: Commit[] }) => <section className="pro-panel" data-testid="pro-panel"><header><h2>Recent Commits</h2></header>{hasItems(commits) ? commits.map((commit, index) => <div className="pro-commit-row" key={`${commit.message}-${index}`}><span>{commit.message}<small>{commit.author || "Unknown author"}</small></span><small>{commit.time || "Unknown time"}</small></div>) : <div className="pro-commit-row"><span>{"No commits available"}</span></div>}</section>;

export async function ProDashboard({ projectId }: { projectId: string }) {
  const data = await getProDashboardData(projectId);
  const project = data.project.ok ? data.project.data : null;
  const overview = data.overview.ok ? data.overview.data : null;
  const health = data.health.ok ? data.health.data : null;
  const execution = data.execution.ok ? data.execution.data : null;
  const executionPipeline = execution?.jobs.map((job) => ({ label: job.label, status: job.status, updatedAt: job.completedAt || job.startedAt })) ?? [];
  const logs = execution?.logs?.length ? execution.logs : (project?.logs ?? []);
  const testJob = execution?.jobs.find((job) => job.type === "run_tests" && (job.resultSummary || job.artifactPath));

  return (
    <section className="pro-dashboard" aria-label="Pro dashboard" data-project-id={projectId}>
      <aside className="pro-dashboard-sidebar" aria-label="Botomatic sidebar">
        <Link href="/" className="pro-dashboard-brand"><span className="pro-dashboard-brand-icon">⬢</span><span><strong>Botomatic</strong><small>NEXUS</small></span></Link>
        <button type="button" className="pro-dashboard-new-project">+ New Project</button>
        <nav className="pro-dashboard-nav" aria-label="Main navigation">{proSidebarNav.map((item) => <button type="button" key={item}>{item}</button>)}</nav>
        <div className="pro-sidebar-card"><h3>Recent Projects</h3>{proRecentProjects.map((recentProject, index) => <div className={`pro-sidebar-row${index === 0 ? " is-active" : ""}`} key={recentProject.name}><span>{recentProject.name}</span><small>{recentProject.updated}</small></div>)}<button type="button" className="pro-link-button">View all projects →</button></div>
        <div className="pro-sidebar-upgrade"><h3>Account</h3><small>Static list</small><button type="button">Upgrade options</button></div>
      </aside>
      <div className="pro-dashboard-main">
        <header className="pro-topbar" data-testid="pro-toolbar"><div className="pro-topbar-title"><h1>Pro Mode <span>PRO</span></h1><p>Technical. Powerful. Complete control.</p></div><div className="pro-toolbar" aria-label="Pro controls"><div className="pro-select" aria-label="Project selector"><small>Project</small><strong>Current project</strong></div><div className="pro-select" aria-label="Branch selector"><small>Branch</small><strong>main</strong></div><div className="pro-select" aria-label="Environment selector"><small>Environment</small><strong>Development</strong></div><button type="button" disabled aria-label="Run controls unavailable">Run</button><button type="button" disabled aria-label="Launch controls unavailable">Launch</button><button type="button" className="is-primary" disabled aria-label="Deploy controls unavailable">Deploy</button></div></header>
        <p className="sr-only">Code Changes Live Application AI Copilot Deploy</p>
        <nav className="pro-subnav" aria-label="Pro navigation">{proSecondaryNav.map((item, index) => <button type="button" key={item} className={index === 0 ? "is-active" : ""}>{item}</button>)}</nav>
        <div className="pro-grid" data-testid="pro-grid">
          <BuildPipelinePanel pipeline={executionPipeline.length > 0 ? executionPipeline : (project?.latestRun?.stages ?? [])} />
          <SystemHealthPanel healthStatus={health?.status} projectStatus={project?.projectStatus} latestRunStatus={overview?.latestRun?.status} />
          <CodeChangesPanel changes={project?.codeChanges ?? []} />
          <section className="pro-panel" data-testid="pro-panel"><header><h2>Live Application</h2></header><LiveApplicationPanel runtimeStatus={project?.runtime?.status} previewUrl={project?.runtime?.previewUrl} previewUnavailableLabel="Preview unavailable" runtimeNotConnectedLabel="Runtime not connected" /></section>
          <ServicesPanel services={project?.services ?? []} />
          <DatabasePanel schema={project?.database?.schema ?? []} />
          <TestResultsPanel tests={project?.tests} evidence={testJob ? { summary: testJob.resultSummary, artifactPath: testJob.artifactPath } : undefined} />
          <TerminalPanel logs={logs} />
          <CopilotPanel activity={project?.copilotActivity ?? []} />
          <RecentCommitsPanel commits={project?.commits ?? []} />
        </div>
      </div>
    </section>
  );
}
