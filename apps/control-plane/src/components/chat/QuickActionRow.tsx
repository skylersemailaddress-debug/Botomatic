import { compileProject, planProject, executeNext } from "@/services/actions";

export default function QuickActionRow({ projectId }: { projectId: string }) {
  async function run(fn: () => Promise<unknown>) {
    try {
      await fn();
      location.reload();
    } catch {
      alert("Action failed.");
    }
  }

  return (
    <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
      {[
        { label: "Compile", action: () => compileProject(projectId) },
        { label: "Plan", action: () => planProject(projectId) },
        { label: "Execute", action: () => executeNext(projectId) },
        { label: "Refresh", action: () => Promise.resolve(location.reload()) },
      ].map((btn) => (
        <button
          key={btn.label}
          onClick={() => run(btn.action)}
          style={{
            fontSize: 12,
            padding: "6px 10px",
            borderRadius: 999,
            background: "var(--panel-soft)",
          }}
        >
          {btn.label}
        </button>
      ))}
    </div>
  );
}
