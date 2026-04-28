import { NexusMode } from "./types";

type DeviceView = "Desktop" | "Tablet" | "Mobile";

export default function NexusTopbar({
  mode,
  projectId,
  branch,
  environment,
  deviceView,
  onSetDeviceView,
  onRunAll,
  onLaunch,
  onDeploy,
}: {
  mode: NexusMode;
  projectId: string;
  branch: string;
  environment: string;
  deviceView: DeviceView;
  onSetDeviceView: (next: DeviceView) => void;
  onRunAll: () => void;
  onLaunch: () => void;
  onDeploy: () => void;
}) {
  return (
    <header className="nexus-topbar">
      <div>
        <h1>{mode === "vibe" ? "Vibe Mode" : "Pro Mode"}</h1>
        <p>{mode === "vibe" ? "Chat. Design. Build. Launch. All in one flow." : "Technical. Powerful. Complete control."}</p>
      </div>

      {mode === "vibe" && (
        <div className="nexus-device-switch" role="tablist" aria-label="Preview device switcher">
          {(["Desktop", "Tablet", "Mobile"] as DeviceView[]).map((view) => (
            <button
              key={view}
              className={view === deviceView ? "is-active" : ""}
              aria-pressed={view === deviceView}
              onClick={() => onSetDeviceView(view)}
            >
              {view}
            </button>
          ))}
        </div>
      )}

      <div className="nexus-topbar-meta">
        <div>Project: {projectId}</div>
        <div>Branch: {branch}</div>
        <div>Environment: {environment}</div>
      </div>
      <div className="nexus-topbar-actions">
        {mode === "pro" && <button onClick={onRunAll}>Run All</button>}
        <button onClick={onLaunch}>{mode === "vibe" ? "Launch App" : "Launch"}</button>
        <button className="nexus-primary" onClick={onDeploy}>Deploy</button>
      </div>
    </header>
  );
}
