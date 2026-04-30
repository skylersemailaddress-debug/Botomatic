"use client";

import type { OrchestrationGraph } from "@/services/orchestration";

export function VibeOrchestrationPanel({ graph, statusMessage }: { graph: OrchestrationGraph; statusMessage: string }) {
  return (
    <>
      {graph.stages.length === 0 ? <small>{statusMessage}</small> : null}
      {graph.stages.map((stage, index) => (
        <div className="vibe-rail-row" key={`${stage.id || stage.label}-${index}`}>
          <span>{stage.label}</span>
          <strong>{stage.status || "Stage state unavailable"}</strong>
        </div>
      ))}
    </>
  );
}
