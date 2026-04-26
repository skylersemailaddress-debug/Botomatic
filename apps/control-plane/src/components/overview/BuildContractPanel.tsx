"use client";

import { useEffect, useState } from "react";
import Panel from "@/components/ui/Panel";
import { approveBuildContract, generateBuildContract, getSpecStatus } from "@/services/spec";
import MetricCard from "@/components/ui/MetricCard";
import LoadingSkeleton from "@/components/ui/LoadingSkeleton";

export default function BuildContractPanel({ projectId }: { projectId: string }) {
  const [status, setStatus] = useState<any>(null);
  const [busy, setBusy] = useState(false);

  async function refresh() {
    try {
      setStatus(await getSpecStatus(projectId));
    } catch {
      setStatus(null);
    }
  }

  useEffect(() => {
    void refresh();
    const t = setInterval(refresh, 4000);
    return () => clearInterval(t);
  }, [projectId]);

  const contract = status?.contract;
  if (!status) {
    return (
      <Panel title="Build Contract" subtitle="Loading contract state">
        <LoadingSkeleton rows={2} />
      </Panel>
    );
  }

  const isApproved = Boolean(contract?.approvedAt);
  const blockerCount = (contract?.blockers || []).length;

  return (
    <Panel title="Build Contract" subtitle="Spec and execution contract">
      <div className="surface-grid-3">
        <MetricCard label="Ready to build" value={contract?.readyToBuild ? "Yes" : "No"} tone={contract?.readyToBuild ? "success" : "warning"} />
        <MetricCard label="Approved" value={isApproved ? "Yes" : "No"} tone={isApproved ? "success" : "warning"} />
        <MetricCard label="Contract blockers" value={blockerCount} tone={blockerCount > 0 ? "danger" : "default"} />
      </div>

      <div style={{ display: "flex", gap: 8, marginTop: 8 }}>
        <button disabled={busy} onClick={async () => { setBusy(true); await generateBuildContract(projectId); await refresh(); setBusy(false); }}>
          Generate
        </button>
        <button
          disabled={busy || !contract?.readyToBuild}
          onClick={async () => { setBusy(true); await approveBuildContract(projectId); await refresh(); setBusy(false); }}
          title={!contract?.readyToBuild ? "Approval blocked until contract is ready" : "Approve build contract"}
        >
          Approve
        </button>
      </div>

      {blockerCount > 0 ? (
        <div className="state-callout warning" style={{ marginTop: 10 }}>
          Build contract has blockers that must be resolved before launch claims.
        </div>
      ) : null}
    </Panel>
  );
}
