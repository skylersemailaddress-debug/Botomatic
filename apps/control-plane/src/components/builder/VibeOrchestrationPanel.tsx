"use client";

import type { OrchestrationGraph } from "@/services/orchestration";
import type { ExecutionRun } from "@/services/execution";

export function VibeOrchestrationPanel({ graph, statusMessage, executionRun, executionMessage }: { graph: OrchestrationGraph; statusMessage: string; executionRun?: ExecutionRun | null; executionMessage?: string }) {
  return (
    <>
      {graph.stages.length === 0 ? <small>{statusMessage}</small> : null}
      {graph.stages.map((stage, index) => (
        <div className="vibe-rail-row" key={`${stage.id || stage.label}-${index}`}>
          <span>{stage.label}</span>
          <strong>{stage.status || "Stage state unavailable"}</strong>
        </div>
      ))}
      <small>{executionMessage || "Execution status unavailable"}</small>
      {executionRun?.jobs.map((job, index) => (
        <div className="vibe-rail-row" key={`${job.id || job.label}-${index}`}>
          <span>{job.label}</span>
          <strong>{job.status}</strong>
        </div>
      ))}
    </>
  );
}
