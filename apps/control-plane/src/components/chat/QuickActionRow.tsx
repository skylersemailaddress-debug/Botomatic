export default function QuickActionRow({ projectId }: { projectId: string }) {
  return (
    <div style={{ display: "flex", gap: 8 }}>
      <button>Compile</button>
      <button>Plan</button>
      <button>Refresh</button>
      <button>Resume</button>
    </div>
  );
}
