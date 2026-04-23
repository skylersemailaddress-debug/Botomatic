type PanelProps = {
  title?: string;
  children: React.ReactNode;
  footer?: React.ReactNode;
};

export default function Panel({ title, children, footer }: PanelProps) {
  return (
    <div
      style={{
        border: "1px solid var(--border)",
        borderRadius: 10,
        padding: 12,
        background: "var(--panel)",
      }}
    >
      {title ? (
        <div style={{ marginBottom: 8, fontWeight: 600, fontSize: 14 }}>{title}</div>
      ) : null}
      <div>{children}</div>
      {footer ? <div style={{ marginTop: 8 }}>{footer}</div> : null}
    </div>
  );
}
