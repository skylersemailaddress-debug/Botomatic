import type { ReactNode } from "react";

interface CommercialPanelProps {
  title: string;
  eyebrow?: string;
  children: ReactNode;
  className?: string;
}

export function CommercialPanel({ title, eyebrow, children, className = "" }: CommercialPanelProps) {
  return (
    <section className={`commercial-panel ${className}`.trim()}>
      <header>
        <h2>{title}</h2>
        {eyebrow ? <span>{eyebrow}</span> : null}
      </header>
      <div className="commercial-panel-body">{children}</div>
    </section>
  );
}

export function CommercialEmptyState({ title, detail }: { title: string; detail: string }) {
  return (
    <div className="commercial-empty-state">
      <strong>{title}</strong>
      <p>{detail}</p>
    </div>
  );
}
