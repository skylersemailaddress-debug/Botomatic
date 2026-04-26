"use client";

import { useEffect, useState } from "react";
import Panel from "@/components/ui/Panel";
import StatusBadge from "@/components/ui/StatusBadge";
import ErrorCallout from "@/components/ui/ErrorCallout";
import { createSelfUpgradeSpec, getSelfUpgradeStatus } from "@/services/selfUpgrade";

export default function SelfUpgradePanel({ projectId }: { projectId: string }) {
  const [status, setStatus] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);
  const [request, setRequest] = useState("Strengthen proof and validators without weakening thresholds.");
  const [busy, setBusy] = useState(false);

  async function load() {
    try {
      const next = await getSelfUpgradeStatus(projectId);
      setStatus(next);
      setError(null);
    } catch (err: any) {
      setError(String(err?.message || err));
    }
  }

  useEffect(() => {
    void load();
    const t = setInterval(() => void load(), 7000);
    return () => clearInterval(t);
  }, [projectId]);

  const driftDetected = Boolean(status?.drift?.driftDetected);

  return (
    <Panel title="Self-Upgrade Surface" subtitle="Governed system evolution with non-regression checks">
      {error ? <ErrorCallout title="Self-upgrade" detail={error} /> : null}
      <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginBottom: 8 }}>
        <StatusBadge status={driftDetected ? "blocked" : "verified"} />
        <StatusBadge status={status?.regression?.ok ? "ready" : "needs attention"} />
      </div>

      <div style={{ fontSize: 12, color: "var(--text-muted)" }}>
        Affected modules: {Array.isArray(status?.spec?.affectedModules) ? status.spec.affectedModules.join(", ") : "none"}
      </div>
      <div style={{ fontSize: 12, color: "var(--text-muted)", marginTop: 4 }}>
        Regression validators: {Array.isArray(status?.spec?.regressionValidators) ? status.spec.regressionValidators.join(", ") : "none"}
      </div>

      <div style={{ marginTop: 10 }}>
        <textarea
          value={request}
          onChange={(e) => setRequest(e.target.value)}
          rows={2}
          style={{ width: "100%", borderRadius: 10, border: "1px solid var(--border)", padding: 8, background: "var(--panel-soft)", color: "var(--text)" }}
        />
        <button
          style={{ marginTop: 8 }}
          disabled={busy}
          onClick={async () => {
            setBusy(true);
            try {
              await createSelfUpgradeSpec(projectId, request);
              await load();
            } finally {
              setBusy(false);
            }
          }}
        >
          {busy ? "Running..." : "Generate Self-Upgrade Spec"}
        </button>
      </div>

      <div className="state-callout warning" style={{ marginTop: 10 }}>
        Self-upgrade proposals remain validator-gated and must preserve launch proof strictness.
      </div>
    </Panel>
  );
}
