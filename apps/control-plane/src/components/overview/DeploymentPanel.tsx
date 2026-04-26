"use client";

import { useEffect, useState } from "react";
import { getProjectDeployments, promoteProject, rollbackProject } from "@/services/deployments";
import { getProjectGate } from "@/services/gate";
import Panel from "@/components/ui/Panel";
import LoadingSkeleton from "@/components/ui/LoadingSkeleton";

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

  async function handleRollback(env: "dev" | "staging" | "prod") {
    setBusyEnv(env);
    try {
      await rollbackProject(projectId, env);
    } finally {
      setBusyEnv(null);
    }
  }

  if (!deployments || !gate) {
    return (
      <Panel title="Deployment Readiness" subtitle="Loading deployment state">
        <LoadingSkeleton rows={2} />
      </Panel>
    );
  }

  const canPromote = gate.role === "admin" && gate.launchStatus === "ready";
  const isAdmin = gate.role === "admin";

  return (
    <Panel
      title="Deployment Readiness"
      footer={
        !canPromote ? (
          <div style={{ fontSize: 12, color: "var(--text-muted)" }}>
            Credentialed deployment requires explicit approval. Live deployment blocked by default.
          </div>
        ) : null
      }
    >
      <div style={{ display: "grid", gap: 8 }}>
        {(["dev", "staging", "prod"] as const).map((env) => {
          const d = deployments[env];
          const canRollback = isAdmin && Boolean(d?.promotedAt) && d?.status !== "rolled_back";
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
                    promoted by {d.promotedBy} · {d.promotedAt}
                  </div>
                )}
                {d?.rollbackBy && (
                  <div style={{ fontSize: 11, color: "var(--text-muted)" }}>
                    rolled back by {d.rollbackBy} · {d.rollbackAt}
                  </div>
                )}
              </div>

              <div style={{ display: "flex", gap: 8 }}>
                <button
                  onClick={() => handlePromote(env)}
                  disabled={!canPromote || busyEnv === env}
                  title={!canPromote ? "Requires admin role and ready launch gate" : "Promote environment"}
                >
                  {busyEnv === env ? "Working..." : "Promote"}
                </button>
                <button
                  onClick={() => handleRollback(env)}
                  disabled={!canRollback || busyEnv === env}
                  title={!canRollback ? "Rollback unavailable until a promoted deployment exists" : "Rollback environment"}
                >
                  {busyEnv === env ? "Working..." : "Rollback"}
                </button>
              </div>
            </div>
          );
        })}
      </div>
      <div className="state-callout warning" style={{ marginTop: 10 }}>
        No live deployment executed in this proof-backed repository pass.
      </div>
    </Panel>
  );
}
