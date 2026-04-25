"use client";

import { useEffect, useState } from "react";
import Panel from "@/components/ui/Panel";
import { getSpecStatus } from "@/services/spec";

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
    <Panel title="Assumption Ledger">
      {assumptions.length === 0 ? <div style={{ fontSize: 12 }}>No assumptions yet.</div> : null}
      {assumptions.slice(0, 6).map((a, i) => (
        <div key={i} style={{ fontSize: 12, marginBottom: 4 }}>
          {a.field}: {a.decision} ({a.approved ? "approved" : "pending"})
        </div>
      ))}
    </Panel>
  );
}
