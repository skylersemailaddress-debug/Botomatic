export function NexusPanel({ title, children, className = "" }: { title: string; children: React.ReactNode; className?: string }) {
  return (
    <section className={`nexus-panel ${className}`.trim()}>
      <h3>{title}</h3>
      {children}
    </section>
  );
}

export function StatusPill({ value, tone }: { value: string; tone: "ok" | "warn" | "bad" }) {
  return <b data-tone={tone}>{value}</b>;
}

export function StatusDot({ tone }: { tone: "ok" | "warn" | "bad" }) {
  return <span className={`nexus-status-dot nexus-status-dot--${tone}`} aria-hidden />;
}
