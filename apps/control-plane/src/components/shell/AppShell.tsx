export default function AppShell({ projectName, environment, runStatus, children }: any) {
  return (
    <div style={{ background: "var(--bg)", minHeight: "100vh" }}>
      <div
        style={{
          height: 56,
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          padding: "0 20px",
          borderBottom: "1px solid var(--border)",
          background: "var(--panel-strong)",
          backdropFilter: "blur(6px)",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <div style={{ fontWeight: 600, letterSpacing: 0.2 }}>Botomatic</div>
          <div
            style={{
              fontSize: 11,
              padding: "2px 8px",
              borderRadius: 999,
              background: "var(--accent-soft)",
              color: "var(--accent)",
            }}
          >
            control plane
          </div>
        </div>

        <div style={{ fontSize: 12, color: "var(--text-muted)" }}>
          {projectName} · {environment} · {runStatus}
        </div>
      </div>

      <div style={{ maxWidth: 1400, margin: "0 auto" }}>{children}</div>
    </div>
  );
}
