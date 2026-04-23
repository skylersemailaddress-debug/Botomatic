import { useEffect, useState } from "react";
import { getProjectOverview } from "@/services/overview";

export default function OverviewPanel({ projectId }: { projectId: string }) {
  const [data, setData] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    getProjectOverview(projectId)
      .then(setData)
      .catch((e) => setError(e.message));
  }, [projectId]);

  if (error) {
    return <div style={{ padding: 16 }}>Overview failed to load.</div>;
  }

  if (!data) {
    return <div style={{ padding: 16 }}>Loading overview...</div>;
  }

  return (
    <div style={{ padding: 16, display: "flex", flexDirection: "column", gap: 16 }}>
      <div style={{ border: "1px solid var(--border)", padding: 12 }}>
        <strong>Run</strong>
        <div>{data.latestRun.status}</div>
      </div>
      <div style={{ border: "1px solid var(--border)", padding: 12 }}>
        <strong>Stages</strong>
        <div>{data.summary.packetCount} packets</div>
      </div>
      <div style={{ border: "1px solid var(--border)", padding: 12 }}>
        <strong>Readiness</strong>
        <div>{data.readiness.status}</div>
      </div>
      <div style={{ border: "1px solid var(--border)", padding: 12 }}>
        <strong>Activity</strong>
        <div>{data.activity?.[0]?.label}</div>
      </div>
      <div style={{ border: "1px solid var(--border)", padding: 12 }}>
        <strong>Artifacts</strong>
        <div>{data.latestArtifact.changedFiles} changes</div>
      </div>
      <div style={{ border: "1px solid var(--border)", padding: 12 }}>
        <strong>Blockers</strong>
        <div>{data.blockers?.[0] || "None"}</div>
      </div>
    </div>
  );
}
