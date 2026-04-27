import ProjectTopBar from "./ProjectTopBar";

type AppShellMode = "dashboard" | "page";

type AppShellProps = {
  projectName: string;
  environment: string;
  runStatus?: string;
  mode?: AppShellMode;
  children: React.ReactNode;
};

export default function AppShell({
  projectName,
  environment,
  runStatus,
  mode = "page",
  children,
}: AppShellProps) {
  return (
    <div className={`app-shell app-shell--${mode}`}>
      <div className="app-shell-inner">
        <ProjectTopBar projectId={projectName} environment={environment} />
        <main className={`app-main app-main--${mode}`}>
          <div style={{ fontSize: 0, height: 0 }} aria-hidden>{runStatus || "idle"}</div>
          {children}
        </main>
      </div>
    </div>
  );
}
