"use client";

import { useEffect, useState } from "react";
import {
  getOpsMetrics,
  getOpsErrors,
  getOpsQueue,
  type OpsError,
  type OpsMetrics,
  type OpsQueue,
} from "@/services/ops";
import Panel from "@/components/ui/Panel";

export default function OpsPanel() {
  const [metrics, setMetrics] = useState<OpsMetrics | null>(null);
  const [errors, setErrors] = useState<OpsError[]>([]);
  const [queue, setQueue] = useState<OpsQueue | null>(null);

  useEffect(() => {
    const load = async () => {
      try {
        const [m, e, q] = await Promise.all([
          getOpsMetrics(),
          getOpsErrors(),
          getOpsQueue(),
        ]);
        setMetrics(m);
        setErrors(e.errors || []);
        setQueue(q);
      } catch {
        // silent fail for now
      }
    };

    load();
    const t = setInterval(load, 3000);
    return () => clearInterval(t);
  }, []);

  return (
    <Panel title="System Ops">
      <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
        <div>
          <div style={{ fontSize: 12, color: "var(--text-muted)" }}>Queue</div>
          <div style={{ fontSize: 13 }}>
            workers: {queue?.activeWorkers ?? "-"} / {queue?.workerConcurrency ?? "-"}
          </div>
          <div style={{ fontSize: 13 }}>depth: {queue?.queueDepth ?? "-"}</div>
        </div>

        <div>
          <div style={{ fontSize: 12, color: "var(--text-muted)" }}>Metrics</div>
          <div style={{ fontSize: 13 }}>success: {metrics?.packetSuccessCount ?? 0}</div>
          <div style={{ fontSize: 13 }}>fail: {metrics?.packetFailureCount ?? 0}</div>
          <div style={{ fontSize: 13 }}>promotions: {metrics?.promotionCount ?? 0}</div>
        </div>

        <div>
          <div style={{ fontSize: 12, color: "var(--text-muted)" }}>Recent Errors</div>
          {errors.length === 0 && (
            <div style={{ fontSize: 12, color: "var(--text-subtle)" }}>No errors</div>
          )}
          {errors.slice(0, 5).map((e, idx) => (
            <div key={idx} style={{ fontSize: 12, color: "var(--danger)" }}>
              {e.type}: {e.message}
            </div>
          ))}
        </div>
      </div>
    </Panel>
  );
}
