export default function OverviewPanel({ projectId }: { projectId: string }) {
  return (
    <div style={{ padding: 16, display: "flex", flexDirection: "column", gap: 16 }}>
      <div style={{ border: "1px solid var(--border)", padding: 12 }}>
        <strong>Run</strong>
        <div>No active run</div>
      </div>
      <div style={{ border: "1px solid var(--border)", padding: 12 }}>
        <strong>Stages</strong>
        <div>Compile not started</div>
      </div>
      <div style={{ border: "1px solid var(--border)", padding: 12 }}>
        <strong>Readiness</strong>
        <div>Blocked</div>
      </div>
      <div style={{ border: "1px solid var(--border)", padding: 12 }}>
        <strong>Activity</strong>
        <div>No recent activity</div>
      </div>
      <div style={{ border: "1px solid var(--border)", padding: 12 }}>
        <strong>Artifacts</strong>
        <div>No artifact has been generated.</div>
      </div>
      <div style={{ border: "1px solid var(--border)", padding: 12 }}>
        <strong>Blockers</strong>
        <div>No blocking issues reported.</div>
      </div>
    </div>
  );
}
