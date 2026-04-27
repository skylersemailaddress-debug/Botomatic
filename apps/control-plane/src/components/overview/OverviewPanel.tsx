"use client";

import { useEffect, useState } from "react";
import { getProjectOverview } from "@/services/overview";
import Panel from "@/components/ui/Panel";
import StatusBadge from "@/components/ui/StatusBadge";
import MetricCard from "@/components/ui/MetricCard";
import LoadingSkeleton from "@/components/ui/LoadingSkeleton";
import ErrorCallout from "@/components/ui/ErrorCallout";
import ReadinessTimeline from "@/components/ui/ReadinessTimeline";

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
        <ErrorCallout title="Overview error" detail={error} />
      </Panel>
    );
  }

  if (!data) {
    return (
      <Panel title="Project Overview" subtitle="Loading">
        <LoadingSkeleton rows={3} />
      </Panel>
    );
  }

  return (
    <Panel title="Project Overview" subtitle="Intelligence summary">
      <div style={{ display: "flex", gap: 8, marginBottom: 10 }}>
        <StatusBadge status={data.latestRun.status} />
        <StatusBadge status={data.readiness.status} />
      </div>

      <div className="surface-grid-2">
        <MetricCard label="Packet count" value={data.summary.packetCount} />
        <MetricCard label="Completed packets" value={data.summary.completedPackets} tone="success" />
        <MetricCard label="Failed packets" value={data.summary.failedPackets} tone={data.summary.failedPackets > 0 ? "danger" : "default"} />
        <MetricCard label="Artifact changes" value={data.latestArtifact.changedFiles} />
      </div>

      <div style={{ marginTop: 10, fontSize: 12, color: "var(--text-muted)" }}>
        {data.activity?.[0]?.label || "No recent activity yet."}
      </div>

      <div style={{ marginTop: 10 }}>
        <ReadinessTimeline
          steps={[
            { label: "Spec and contract readiness", status: data.readiness?.status === "ready" ? "passed" : "pending" },
            { label: "Execution and packet health", status: data.summary?.failedPackets > 0 ? "blocked" : "passed" },
            { label: "Validator-backed evidence", status: data.readiness?.status === "ready" ? "passed" : "pending" },
          ]}
        />
      </div>

      {data.blockers?.length > 0 ? (
        <div className="state-callout warning" style={{ marginTop: 10 }}>
          Top blocker: {data.blockers[0]}
        </div>
      ) : (
        <div className="state-callout success" style={{ marginTop: 10 }}>
          Launch gates satisfied under current validator-backed evidence.
        </div>
      )}
    </Panel>
  );
}
