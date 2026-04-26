type ReadinessStep = {
  label: string;
  status: "passed" | "blocked" | "pending" | string;
};

export default function ReadinessTimeline({ steps }: { steps: ReadinessStep[] }) {
  return (
    <ol className="readiness-timeline" aria-label="Readiness timeline">
      {steps.map((step) => (
        <li key={step.label} className={`readiness-step is-${step.status}`}>
          <span className="readiness-dot" aria-hidden="true" />
          <div className="readiness-content">
            <div className="readiness-label">{step.label}</div>
            <div className="readiness-status">{step.status}</div>
          </div>
        </li>
      ))}
    </ol>
  );
}
