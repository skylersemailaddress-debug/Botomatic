"use client";

import { useEffect, useState } from "react";
import { getProjectArtifacts } from "@/services/packets";
import Panel from "@/components/ui/Panel";
import StatusBadge from "@/components/ui/StatusBadge";
import EvidenceLink from "@/components/ui/EvidenceLink";
import EmptyState from "@/components/ui/EmptyState";

export default function ArtifactPanel({ projectId }: { projectId: string }) {
  const [artifacts, setArtifacts] = useState<any[]>([]);

  useEffect(() => {
    const load = async () => {
      const res: any = await getProjectArtifacts(projectId);
      setArtifacts(res.artifacts || []);
    };
    void load();
    const t = setInterval(load, 3000);
    return () => clearInterval(t);
  }, [projectId]);

  return (
    <Panel title="Artifact Evidence" subtitle="Build and execution evidence links">
      {artifacts.length === 0 ? <EmptyState title="No artifacts available" detail="Artifact evidence appears after packet execution completes." /> : null}
      {artifacts.map((a) => (
        <div key={a.operationId} className="proof-status-card" style={{ marginTop: 8 }}>
          <div className="proof-status-header">
            <div className="proof-status-title">{a.operationId}</div>
            <StatusBadge status={a.status || "pending"} />
          </div>
          {a.prUrl ? <EvidenceLink href={a.prUrl} label="Pull request evidence" /> : null}
          {a.error ? <div className="state-callout error" style={{ marginTop: 8 }}>{a.error}</div> : null}
        </div>
      ))}
    </Panel>
  );
}
