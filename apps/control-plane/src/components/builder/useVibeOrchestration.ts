"use client";

import { useCallback, useEffect, useMemo, useState } from "react";

import { getOrchestrationStatus, submitVibeIntake, type OrchestrationGraph, type OrchestrationStage } from "@/services/orchestration";

const terminalStages = new Set(["complete", "failed", "blocked"]);

function isTerminal(stages: OrchestrationStage[]): boolean {
  return stages.length > 0 && stages.every((stage) => terminalStages.has(stage.status));
}

function hasBackendOrchestration(graph: OrchestrationGraph, runId?: string): boolean {
  return Boolean(runId || graph.runId || graph.objective || graph.nextStep || graph.stages.length > 0);
}

export function useVibeOrchestration(projectId: string) {
  const [prompt, setPrompt] = useState("");
  const [graph, setGraph] = useState<OrchestrationGraph>({ projectId, stages: [] });
  const [runId, setRunId] = useState<string | undefined>();
  const [submitting, setSubmitting] = useState(false);
  const [hasSubmitted, setHasSubmitted] = useState(false);
  const [statusMessage, setStatusMessage] = useState("No orchestration started");

  const activeRun = useMemo(() => Boolean(runId) && !isTerminal(graph.stages), [graph.stages, runId]);

  const refreshStatus = useCallback(async () => {
    const result = await getOrchestrationStatus(projectId, runId);
    if (!result.ok) {
      if (hasSubmitted || runId) setStatusMessage(result.message || "Execution status unavailable");
      return;
    }
    const next = result.data.graph;
    const nextRunId = result.data.runId || runId;
    const hasRealData = hasBackendOrchestration(next, nextRunId);
    if (!hasRealData && !hasSubmitted) {
      setStatusMessage("No orchestration started");
      return;
    }

    setGraph(next);
    setRunId(nextRunId);
    if (next.stages.length === 0) {
      setStatusMessage(hasSubmitted ? "Stage state unavailable" : "No orchestration started");
    } else {
      setStatusMessage("Execution pending");
    }
  }, [hasSubmitted, projectId, runId]);

  useEffect(() => {
    let cancelled = false;
    const tick = async () => {
      if (!cancelled) await refreshStatus();
    };
    void tick();
    if (!activeRun) return () => { cancelled = true; };
    const timer = window.setInterval(() => void tick(), 3000);
    return () => {
      cancelled = true;
      window.clearInterval(timer);
    };
  }, [activeRun, refreshStatus]);

  const submitPrompt = useCallback(async () => {
    const trimmed = prompt.trim();
    if (!trimmed) return;
    setHasSubmitted(true);
    setSubmitting(true);
    const result = await submitVibeIntake(projectId, trimmed);
    setSubmitting(false);
    if (!result.ok) {
      setStatusMessage(result.message || "Planner unavailable");
      return;
    }
    const nextRunId = result.data.runId;
    setRunId(nextRunId);
    setGraph(result.data.graph);
    setStatusMessage(result.data.graph.stages.length > 0 ? "Execution pending" : "Stage state unavailable");
  }, [projectId, prompt]);

  return { prompt, setPrompt, submitting, submitPrompt, graph, statusMessage };
}
