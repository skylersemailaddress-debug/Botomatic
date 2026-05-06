"use client";

type Candidate = { id?: string; nodeId?: string; label: string; type: string; page: string; location: string };

export function LiveUIBuilderResolutionPanel({ candidates = [], onResolve }: { candidates?: Candidate[]; onResolve: (candidate: Candidate) => void }) {
  return (
    <section className="live-ui-builder-resolution-panel" aria-label="Live UI target resolution">
      <h4>Target resolution</h4>
      {candidates.length === 0 ? <p>No ambiguous target needs resolution.</p> : candidates.map((candidate) => (
        <button key={candidate.id ?? candidate.nodeId ?? candidate.label} type="button" onClick={() => onResolve(candidate)}>
          <strong>{candidate.label}</strong>
          <span>{candidate.type}</span>
          <span>{candidate.page}</span>
          <small>{candidate.location}</small>
        </button>
      ))}
    </section>
  );
}
