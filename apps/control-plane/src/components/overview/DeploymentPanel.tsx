import { useEffect, useState } from "react";
import { getProjectDeployments, promoteProject } from "@/services/deployments";
import { getProjectGate } from "@/services/gate";

export default function DeploymentPanel({ projectId }: { projectId: string }) {
  const [deployments, setDeployments] = useState<any>(null);
  const [gate, setGate] = useState<any>(null);
  const [busyEnv, setBusyEnv] = useState<string | null>(null);

  useEffect(() => {
    const load = async () => {
      const d = await getProjectDeployments(projectId);
      const g = await getProjectGate(projectId);
      setDeployments(d.deployments);
      setGate(g);
    };
    void load();
    const t = setInterval(load, 3000);
    return () => clearInterval(t);
  }, [projectId]);

  async function handlePromote(env: "dev" | "staging" | "prod") {
    setBusyEnv(env);
    try {
      await promoteProject(projectId, env);
    } finally {
      setBusyEnv(null);
    }
  }

  if (!deployments || !gate) return <div style={{ padding: 16 }}>Loading deployments...</div>;

  const canPromote = gate.role === "admin" && gate.launchStatus === "ready";

  return (
    <div style={{ padding: 16, borderTop: "1px solid var(--border)" }}>
      <strong>Deployment</strong>
      {(["dev", "staging", "prod"] as const).map((env) => {
        const d = deployments[env];
        return (
          <div key={env} style={{ border: "1px solid var(--border)", padding: 8, marginTop: 8 }}>
            <div>{env.toUpperCase()}</div>
            <div>Status: {d?.status || "idle"}</div>
            {d?.promotedBy && (
              <div style={{ fontSize: 12 }}>
                by {d.promotedBy} at {d.promotedAt}
              </div>
            )}
            <button
              onClick={() => handlePromote(env)}
              disabled={!canPromote || busyEnv === env}
            >
              {busyEnv === env ? "Promoting..." : "Promote"}
            </button>
          </div>
        );
      })}
      {!canPromote && (
        <div style={{ marginTop: 8, fontSize: 12, color: "var(--text-muted)" }}>
          Promotion requires admin role and ready gate
        </div>
      )}
    </div>
  );
}
