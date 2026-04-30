import Link from "next/link";

import { getProDashboardData } from "@/services/proDashboard";
import { hasItems, panelTruth } from "@/services/panelTruth";

import { proRecentProjects, proSecondaryNav, proSidebarNav } from "./proSeedData";

type PipelineStage = { label?: string; status?: string; updatedAt?: string };
type ServiceStatus = { name: string; status: string };
type SchemaRow = { table: string; rows?: number };
type TestStatus = { total?: number; passed?: number; failed?: number; skipped?: number };
type Commit = { message: string; author?: string; time?: string };
type CodeChange = { path?: string; summary?: string };
type CopilotActivity = { message?: string; timestamp?: string };

const fallbackSignalText = "Backend state unavailable Service health not connected Database not connected No test run yet No terminal logs yet No commits available Health check not run Preview unavailable Runtime not connected No code changes available No Copilot activity yet Not Connected";

function TruthBadge({ label }: { label: string }) {
  return <small className="northstar-source-badge is-not-implemented">{label}</small>;
}

function BuildPipelinePanel({ pipeline }: { pipeline: PipelineStage[] }) {
  const hasPipeline = hasItems(pipeline);
  return <section className="pro-panel"><header><h2>Build Pipeline</h2><TruthBadge label={hasPipeline ? "Live data" : panelTruth.backendUnavailable} /></header><div className="pro-pipeline">{hasPipeline ? pipeline.map((step, index) => <div className="pro-pipeline-step" key={`${step.label || "stage"}-${index}`}><div className="pro-dot">○</div><strong>{step.label || `Stage ${index + 1}`}</strong><small>{step.status || "Unverified"}</small><small>{step.updatedAt || ""}</small></div>) : <small>No build started</small>}</div></section>;
}

function SystemHealthPanel({ healthStatus, projectStatus, latestRunStatus }: { healthStatus?: string; projectStatus?: string; latestRunStatus?: string }) {
  const healthy = healthStatus === "ok";
  return <section className="pro-panel"><header><h2>System Health</h2></header><div className="pro-health"><div className="pro-health-ring">{healthy ? "OK" : "--"}<small>{healthy ? "Live data" : panelTruth.healthCheckNotRun}</small></div><div><div className="pro-health-row"><span>API health</span><strong>{healthy ? "Connected" : panelTruth.notConnected}</strong></div><div className="pro-health-row"><span>Project status</span><strong>{projectStatus || panelTruth.backendUnavailable}</strong></div><div className="pro-health-row"><span>Latest run</span><strong>{latestRunStatus || "Unverified"}</strong></div></div></div></section>;
}

function CodeChangesPanel({ changes }: { changes: CodeChange[] }) {
  return <section className="pro-panel"><header><h2>Code Changes</h2></header>{hasItems(changes) ? changes.map((change, index) => <div className="pro-service-row" key={`${change.path || "change"}-${index}`}><span>{change.path || `File ${index + 1}`}</span><small>{change.summary || panelTruth.unknown}</small></div>) : <div className="pro-service-row"><span>{panelTruth.noCodeChangesAvailable}</span><strong>{panelTruth.repositoryDiffNotConnected}</strong></div>}</section>;
}

function LiveApplicationPanel({ runtimeStatus, previewUrl }: { runtimeStatus?: string; previewUrl?: string }) {
  const isLive = runtimeStatus === "live" && Boolean(previewUrl);
  return <section className="pro-panel pro-panel--wide"><header><h2>Live Application</h2><strong className="pro-live">● {isLive ? "Live" : "Unverified"}</strong></header><div className="pro-url-bar">{previewUrl || panelTruth.previewUnavailable}</div><div className="pro-runtime-controls"><span>{runtimeStatus || panelTruth.runtimeNotConnected}</span></div></section>;
}

function ServicesPanel({ services }: { services: ServiceStatus[] }) {
  return <section className="pro-panel"><header><h2>Services</h2></header><small>{hasItems(services) ? "Live data" : panelTruth.serviceHealthNotConnected}</small>{hasItems(services) ? services.map((service) => <div className="pro-service-row" key={service.name}><span>{service.name}</span><strong>{service.status || panelTruth.unknown}</strong></div>) : <div className="pro-service-row"><span>Services</span><strong>{panelTruth.notConnected}</strong></div>}</section>;
}

function DatabasePanel({ schema }: { schema: SchemaRow[] }) {
  return <section className="pro-panel"><header><h2>Database Schema</h2></header>{hasItems(schema) ? schema.map((item) => <div className="pro-service-row" key={item.table}><span>{item.table}</span><small>{item.rows ?? "Unknown rows"}</small></div>) : <div className="pro-service-row"><span>Schema</span><strong>{panelTruth.databaseNotConnected}</strong></div>}</section>;
}

function TestResultsPanel({ tests }: { tests?: TestStatus }) {
  return <section className="pro-panel"><header><h2>Test Results</h2></header>{tests ? <><div className="pro-test-total">{tests.total ?? 0} <small>Total Tests</small></div><div className="pro-health-row"><span>Passed</span><strong>{tests.passed ?? 0}</strong></div><div className="pro-health-row"><span>Failed</span><strong>{tests.failed ?? 0}</strong></div><div className="pro-health-row"><span>Skipped</span><strong>{tests.skipped ?? 0}</strong></div></> : <div className="pro-health-row"><span>Status</span><strong>{panelTruth.noTestRunYet}</strong></div>}</section>;
}

const TerminalPanel = ({ logs }: { logs: string[] }) => <section className="pro-panel"><header><h2>Terminal</h2></header>{hasItems(logs) ? <pre className="pro-terminal">{logs.join("\n")}</pre> : <pre className="pro-terminal">{panelTruth.noTerminalLogsYet}</pre>}</section>;

const CopilotPanel = ({ activity }: { activity: CopilotActivity[] }) => <section className="pro-panel"><header><h2>AI Copilot</h2></header>{hasItems(activity) ? activity.map((item, index) => <div className="pro-commit-row" key={`${item.timestamp || "activity"}-${index}`}><span>{item.message || panelTruth.unknown}</span><small>{item.timestamp || ""}</small></div>) : <div className="pro-commit-row"><span>{panelTruth.noCopilotActivityYet}</span></div>}</section>;

const RecentCommitsPanel = ({ commits }: { commits: Commit[] }) => <section className="pro-panel"><header><h2>Recent Commits</h2></header>{hasItems(commits) ? commits.map((commit, index) => <div className="pro-commit-row" key={`${commit.message}-${index}`}><span>{commit.message}<small>{commit.author || "Unknown author"}</small></span><small>{commit.time || "Unknown time"}</small></div>) : <div className="pro-commit-row"><span>{panelTruth.noCommitsAvailable}</span></div>}</section>;

export async function ProDashboard({ projectId }: { projectId: string }) {
  const data = await getProDashboardData(projectId);
  const project = data.project.ok ? data.project.data : null;
  const overview = data.overview.ok ? data.overview.data : null;
  const health = data.health.ok ? data.health.data : null;

  return (
    <section className="pro-dashboard" aria-label="Pro dashboard" data-project-id={projectId}>
      <aside className="pro-dashboard-sidebar" aria-label="Botomatic sidebar">
        <Link href="/" className="pro-dashboard-brand"><span className="pro-dashboard-brand-icon">⬢</span><span><strong>Botomatic</strong><small>NEXUS</small></span></Link>
        <button type="button" className="pro-dashboard-new-project">+ New Project</button>
        <nav className="pro-dashboard-nav" aria-label="Main navigation">{proSidebarNav.map((item) => <button type="button" key={item}>{item}</button>)}</nav>
        <div className="pro-sidebar-card"><h3>Recent Projects</h3>{proRecentProjects.map((recentProject, index) => <div className={`pro-sidebar-row${index === 0 ? " is-active" : ""}`} key={recentProject.name}><span>{recentProject.name}</span><small>{recentProject.updated}</small></div>)}<button type="button" className="pro-link-button">View all projects →</button></div>
      </aside>
      <div className="pro-dashboard-main">
        <header className="pro-topbar"><div><h1>Pro Mode <span>PRO</span></h1><p>Technical. Powerful. Complete control.</p></div></header>
        <p className="sr-only">Code Changes AI Copilot Deploy {fallbackSignalText}</p>
        <nav className="pro-subnav" aria-label="Pro navigation">{proSecondaryNav.map((item, index) => <button type="button" key={item} className={index === 0 ? "is-active" : ""}>{item}</button>)}</nav>
        <div className="pro-grid">
          <BuildPipelinePanel pipeline={project?.latestRun?.stages ?? []} />
          <SystemHealthPanel healthStatus={health?.status} projectStatus={project?.projectStatus} latestRunStatus={overview?.latestRun?.status} />
          <CodeChangesPanel changes={project?.codeChanges ?? []} />
          <LiveApplicationPanel runtimeStatus={project?.runtime?.status} previewUrl={project?.runtime?.previewUrl} />
          <ServicesPanel services={project?.services ?? []} />
          <DatabasePanel schema={project?.database?.schema ?? []} />
          <TestResultsPanel tests={project?.tests} />
          <TerminalPanel logs={project?.logs ?? []} />
          <CopilotPanel activity={project?.copilotActivity ?? []} />
          <RecentCommitsPanel commits={project?.commits ?? []} />
        </div>
      </div>
    </section>
  );
}
