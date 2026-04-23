export default function AppShell({ projectName, environment, runStatus, children }: any) {
  return (
    <div>
      <div style={{
        height: 48,
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        padding: "0 16px",
        borderBottom: "1px solid var(--border)",
        background: "var(--panel)"
      }}>
        <div style={{ fontWeight: 600 }}>Botomatic</div>
        <div style={{ fontSize: 12, color: "var(--text-muted)" }}>
          {projectName} • {environment} • {runStatus}
        </div>
      </div>
      <div>{children}</div>
    </div>
  );
}
