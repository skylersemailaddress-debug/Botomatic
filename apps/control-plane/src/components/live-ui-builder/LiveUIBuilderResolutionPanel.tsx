"use client";

type ResolutionTarget = { nodeId: string; label: string; type: string; page: string; location: string };

export function LiveUIBuilderResolutionPanel({ targets, onResolve, isFallback = false }: { targets: ResolutionTarget[]; onResolve: (nodeId: string) => void; isFallback?: boolean }) {
  return (
    <section className="vibe-resolution-card" aria-label="Resolve ambiguous target">
      <h3>Choose target before applying</h3>
      <p>{isFallback ? "Resolver candidates unavailable. Showing selectable document nodes as fallback." : "Resolver returned multiple matches. Pick one to resolve."}</p>
      <div className="vibe-resolution-targets">
        {targets.map((target) => (
          <button type="button" key={target.nodeId} onClick={() => onResolve(target.nodeId)}>
            <strong>{target.label}</strong>
            <small>{target.type} · {target.page} · {target.location}</small>
          </button>
        ))}
      </div>
    </section>
  );
}

export type { ResolutionTarget };
