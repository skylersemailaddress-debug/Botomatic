import { compileProject, planProject, executeNext } from "@/services/actions";
import { useState } from "react";

export default function QuickActionRow({ projectId }: { projectId: string }) {
  const [error, setError] = useState<string | null>(null);

  async function run(fn: () => Promise<unknown>) {
    try {
      setError(null);
      await fn();
      location.reload();
    } catch {
      setError("Advanced action failed. Review audit timeline for details.");
    }
  }

  return (
    <details className="quick-actions">
      <summary style={{ cursor: "pointer", fontSize: 12, color: "var(--text-muted)" }}>Advanced</summary>
      <div className="quick-actions-buttons">
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
              background: "var(--bg-elevated)",
            }}
          >
            {btn.label}
          </button>
        ))}
      </div>
      {error ? <div className="state-callout warning" style={{ marginTop: 8 }}>{error}</div> : null}
    </details>
  );
}
