"use client";

import { useEffect, useState } from "react";
import Panel from "@/components/ui/Panel";
import { approveBuildContract, generateBuildContract, getSpecStatus } from "@/services/spec";

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
  return (
    <Panel title="Build Contract">
      <div style={{ fontSize: 12 }}>Ready: {contract?.readyToBuild ? "yes" : "no"}</div>
      <div style={{ fontSize: 12 }}>Approved: {contract?.approvedAt ? "yes" : "no"}</div>
      <div style={{ fontSize: 12 }}>Blockers: {(contract?.blockers || []).length}</div>
      <div style={{ display: "flex", gap: 8, marginTop: 8 }}>
        <button disabled={busy} onClick={async () => { setBusy(true); await generateBuildContract(projectId); await refresh(); setBusy(false); }}>
          Generate
        </button>
        <button disabled={busy} onClick={async () => { setBusy(true); await approveBuildContract(projectId); await refresh(); setBusy(false); }}>
          Approve
        </button>
      </div>
    </Panel>
  );
}
