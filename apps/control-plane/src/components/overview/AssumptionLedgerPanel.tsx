"use client";

import { useEffect, useState } from "react";
import Panel from "@/components/ui/Panel";
import { getSpecStatus } from "@/services/spec";
import EmptyState from "@/components/ui/EmptyState";
import StatusBadge from "@/components/ui/StatusBadge";

export default function AssumptionLedgerPanel({ projectId }: { projectId: string }) {
  const [assumptions, setAssumptions] = useState<any[]>([]);

  useEffect(() => {
    const load = async () => {
      try {
        const status = await getSpecStatus(projectId);
        setAssumptions(Array.isArray(status?.spec?.assumptions) ? status.spec.assumptions : []);
      } catch {
        setAssumptions([]);
      }
    };
    void load();
    const t = setInterval(load, 4000);
    return () => clearInterval(t);
  }, [projectId]);

  return (
    <Panel title="Assumption Ledger" subtitle="Commercial assumption governance">
      {assumptions.length === 0 ? <EmptyState title="No assumptions recorded" detail="No assumption entries are currently tracked." /> : null}
      {assumptions.slice(0, 6).map((a, i) => (
        <div key={i} className="proof-status-card" style={{ marginBottom: 6 }}>
          <div className="proof-status-header">
            <div className="proof-status-title">{a.field || "Unlabeled field"}</div>
            <StatusBadge status={a.approved ? "ready" : "pending"} />
          </div>
          <div className="proof-status-detail">{a.decision || "No decision text provided"}</div>
        </div>
      ))}
    </Panel>
  );
}
