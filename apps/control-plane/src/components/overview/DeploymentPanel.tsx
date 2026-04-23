import { useEffect, useState } from "react";
import { getProjectDeployments, promoteProject } from "@/services/deployments";
import { getProjectGate } from "@/services/gate";
import Panel from "@/components/ui/Panel";

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

  if (!deployments || !gate) {
    return <Panel title="Deployment">Loading...</Panel>;
  }

  const canPromote = gate.role === "admin" && gate.launchStatus === "ready";

  return (
    <Panel
      title="Deployment"
      footer={
        !canPromote ? (
          <div style={{ fontSize: 12, color: "var(--text-muted)" }}>
            Promotion requires admin role and ready gate
          </div>
        ) : null
      }
    >
      <div style={{ display: "grid", gap: 8 }}>
        {(["dev", "staging", "prod"] as const).map((env) => {
          const d = deployments[env];
          return (
            <div
              key={env}
              style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                border: "1px solid var(--border)",
                borderRadius: 8,
                padding: 8,
              }}
            >
              <div>
                <div style={{ fontWeight: 600 }}>{env.toUpperCase()}</div>
                <div style={{ fontSize: 12, color: "var(--text-muted)" }}>
                  {d?.status || "idle"}
                </div>
                {d?.promotedBy && (
                  <div style={{ fontSize: 11, color: "var(--text-muted)" }}>
                    {d.promotedBy} · {d.promotedAt}
                  </div>
                )}
              </div>

              <button
                onClick={() => handlePromote(env)}
                disabled={!canPromote || busyEnv === env}
              >
                {busyEnv === env ? "Promoting..." : "Promote"}
              </button>
            </div>
          );
        })}
      </div>
    </Panel>
  );
}
