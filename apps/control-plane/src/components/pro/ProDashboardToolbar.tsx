"use client";

import { useState } from "react";

import { startAutonomousBuild } from "@/services/autonomousBuild";
import { promoteProject } from "@/services/deployments";
import { requestDeploy } from "@/services/launchProof";

export function ProDashboardToolbar({ projectId }: { projectId: string }) {
  const [running, setRunning] = useState(false);
  const [statusMessage, setStatusMessage] = useState<string | null>(null);

  const handleRun = async () => {
    setRunning(true);
    setStatusMessage("Starting autonomous build…");
    try {
      const result = await startAutonomousBuild(projectId, "Build the project autonomously with safe defaults.");
      setStatusMessage(result.ok ? `Build ${result.run?.status ?? "started"}` : "Build unavailable");
    } catch {
      setStatusMessage("Build unavailable");
    } finally {
      setRunning(false);
    }
  };

  const handleLaunch = async () => {
    setStatusMessage("Requesting launch…");
    try {
      await requestDeploy(projectId, { idempotencyKey: `launch_${Date.now()}` });
      setStatusMessage("Launch requested");
    } catch {
      setStatusMessage("Launch unavailable");
    }
  };

  const handleDeploy = async () => {
    setStatusMessage("Deploying to production…");
    try {
      await promoteProject(projectId, "prod");
      setStatusMessage("Deploy requested");
    } catch {
      setStatusMessage("Deploy unavailable");
    }
  };

  return (
    <div className="pro-toolbar" aria-label="Pro controls">
      <div className="pro-select" aria-label="Project selector">
        <small>Project</small>
        <strong>Current project</strong>
      </div>
      <div className="pro-select" aria-label="Branch selector">
        <small>Branch</small>
        <strong>main</strong>
      </div>
      <div className="pro-select" aria-label="Environment selector">
        <small>Environment</small>
        <strong>Development</strong>
      </div>
      {statusMessage ? <small className="pro-toolbar-status">{statusMessage}</small> : null}
      <button type="button" onClick={() => void handleRun()} disabled={running} aria-label="Run autonomous build">
        {running ? "Running…" : "Run"}
      </button>
      <button type="button" onClick={() => void handleLaunch()} aria-label="Launch application">
        Launch
      </button>
      <button type="button" className="is-primary" onClick={() => void handleDeploy()} aria-label="Deploy to production">
        Deploy
      </button>
    </div>
  );
}
