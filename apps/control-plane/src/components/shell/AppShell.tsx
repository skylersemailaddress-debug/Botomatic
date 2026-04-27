import ProjectIntelligenceHeader from "./ProjectIntelligenceHeader";

export default function AppShell({ projectName, environment, runStatus, children }: any) {
  return (
    <div className="app-shell">
      <div className="app-shell-inner">
        <ProjectIntelligenceHeader projectId={projectName} environment={environment} />
        <div style={{ fontSize: 0, height: 0 }} aria-hidden>{runStatus}</div>
        {children}
      </div>
    </div>
  );
}
