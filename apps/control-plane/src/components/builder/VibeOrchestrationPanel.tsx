"use client";

import { useEffect, useMemo, useState } from "react";

import { getOrchestrationStatus, submitVibeIntake, type OrchestrationGraph, type OrchestrationStage } from "@/services/orchestration";

const terminalStages = new Set(["complete", "failed", "blocked"]);

function isRunTerminal(stages: OrchestrationStage[]): boolean {
  return stages.length > 0 && stages.every((stage) => terminalStages.has(stage.status));
}

export function VibeOrchestrationPanel({ projectId }: { projectId: string }) {
  const [prompt, setPrompt] = useState("");
  const [graph, setGraph] = useState<OrchestrationGraph | null>(null);
  const [runId, setRunId] = useState<string | undefined>();
  const [submitting, setSubmitting] = useState(false);
  const [statusMessage, setStatusMessage] = useState("No orchestration started");

  const hasActiveRun = useMemo(() => Boolean(runId) && !isRunTerminal(graph?.stages ?? []), [graph?.stages, runId]);

  useEffect(() => {
    let cancelled = false;
    const fetchStatus = async () => {
      const result = await getOrchestrationStatus(projectId, runId);
      if (cancelled) return;
      if (result.ok) {
        setGraph(result.data.graph);
        setRunId(result.data.runId || runId);
        setStatusMessage(result.data.graph.stages.length > 0 ? "Execution pending" : "Stage state unavailable");
      } else {
        setStatusMessage(result.message || "Execution status unavailable");
      }
    };

    void fetchStatus();
    if (!hasActiveRun) return () => {
      cancelled = true;
    };

    const timer = window.setInterval(() => void fetchStatus(), 3000);
    return () => {
      cancelled = true;
      window.clearInterval(timer);
    };
  }, [hasActiveRun, projectId, runId]);

  async function onSubmit(event: React.FormEvent) {
    event.preventDefault();
    const trimmed = prompt.trim();
    if (!trimmed) return;
    setSubmitting(true);
    const result = await submitVibeIntake(projectId, trimmed);
    setSubmitting(false);
    if (!result.ok) {
      setStatusMessage(result.message || "Planner unavailable");
      return;
    }
    setGraph(result.data.graph);
    setRunId(result.data.runId);
    setStatusMessage(result.data.graph.stages.length > 0 ? "Execution pending" : "Stage state unavailable");
  }

  return (
    <section className="vibe-rail-card" aria-label="Live orchestration">
      <header><h3>Build Map</h3></header>
      <form onSubmit={onSubmit} className="vibe-input-row">
        <input value={prompt} onChange={(e) => setPrompt(e.target.value)} placeholder="Describe what you want to build" aria-label="Vibe prompt" />
        <button type="submit" disabled={submitting}>{submitting ? "Submitting…" : "Send"}</button>
      </form>
      {!graph || graph.stages.length === 0 ? <small>{statusMessage}</small> : null}
      {graph?.stages?.map((stage, index) => (
        <div className="vibe-rail-row" key={`${stage.id || stage.label}-${index}`}>
          <span>{stage.label}</span>
          <strong>{stage.status || "Stage state unavailable"}</strong>
        </div>
      ))}
    </section>
  );
}
