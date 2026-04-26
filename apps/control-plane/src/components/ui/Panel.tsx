type PanelProps = {
  title?: string;
  children: React.ReactNode;
  footer?: React.ReactNode;
  subtitle?: string;
};

export default function Panel({ title, subtitle, children, footer }: PanelProps) {
  return (
    <div
      style={{
        border: "1px solid var(--border)",
        borderRadius: "var(--radius-md)",
        padding: 14,
        background: "var(--panel)",
        boxShadow: "var(--shadow-sm)",
      }}
      className="surface-card"
    >
      {title ? (
        <div className="section-title">
          <h3>{title}</h3>
          {subtitle ? <div style={{ fontSize: 12, color: "var(--text-muted)" }}>{subtitle}</div> : null}
        </div>
      ) : null}
      <div>{children}</div>
      {footer ? <div style={{ marginTop: 8 }}>{footer}</div> : null}
    </div>
  );
}
