"use client";

import { useEffect, useState } from "react";
import { getProjectArtifacts } from "@/services/packets";

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
    <div style={{ padding: 16 }}>
      <strong>Artifacts</strong>
      {artifacts.map((a) => (
        <div key={a.operationId} style={{ border: "1px solid var(--border)", padding: 8, marginTop: 8 }}>
          <div>{a.operationId}</div>
          <div>Status: {a.status}</div>
          {a.prUrl && <a href={a.prUrl} target="_blank">PR</a>}
          {a.error && <div style={{ color: "red" }}>{a.error}</div>}
        </div>
      ))}
    </div>
  );
}
