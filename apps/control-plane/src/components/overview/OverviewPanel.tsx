"use client";

import { useEffect, useState } from "react";
import { getProjectOverview } from "@/services/overview";
import Panel from "@/components/ui/Panel";
import StatusBadge from "@/components/ui/StatusBadge";

export default function OverviewPanel({ projectId }: { projectId: string }) {
  const [data, setData] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let active = true;

    async function load() {
      try {
        const next = await getProjectOverview(projectId);
        if (active) {
          setData(next);
          setError(null);
        }
      } catch (e: any) {
        if (active) {
          setError(e.message || "Overview failed to load.");
        }
      }
    }

    void load();
    const timer = setInterval(() => {
      void load();
    }, 3000);

    return () => {
      active = false;
      clearInterval(timer);
    };
  }, [projectId]);

  if (error) {
    return (
      <Panel title="Project Overview">
        <div className="state-callout error"><strong>Overview error:</strong> {error}</div>
      </Panel>
    );
  }

  if (!data) {
    return (
      <Panel title="Project Overview" subtitle="Loading">
        <div className="skeleton" />
      </Panel>
    );
  }

  return (
    <Panel title="Project Overview" subtitle="Intelligence snapshot">
      <div style={{ display: "flex", gap: 8, marginBottom: 10 }}>
        <StatusBadge status={data.latestRun.status} />
        <StatusBadge status={data.readiness.status} />
      </div>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(2, minmax(0, 1fr))", gap: 8 }}>
        <div className="metric-card">
          <div className="metric-label">Packets</div>
          <div className="metric-value">{data.summary.packetCount}</div>
        </div>
        <div className="metric-card">
          <div className="metric-label">Completed</div>
          <div className="metric-value">{data.summary.completedPackets}</div>
        </div>
        <div className="metric-card">
          <div className="metric-label">Failed</div>
          <div className="metric-value">{data.summary.failedPackets}</div>
        </div>
        <div className="metric-card">
          <div className="metric-label">Artifact Changes</div>
          <div className="metric-value">{data.latestArtifact.changedFiles}</div>
        </div>
      </div>

      <div style={{ marginTop: 10, fontSize: 12, color: "var(--text-muted)" }}>
        {data.activity?.[0]?.label || "No recent activity yet."}
      </div>

      {data.blockers?.length > 0 ? (
        <div className="state-callout warning" style={{ marginTop: 10 }}>
          Top blocker: {data.blockers[0]}
        </div>
      ) : (
        <div className="state-callout success" style={{ marginTop: 10 }}>
          No blocking issue reported in overview.
        </div>
      )}
    </Panel>
  );
}
