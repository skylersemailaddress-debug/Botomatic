"use client";

import { useEffect, useState } from "react";
import Panel from "@/components/ui/Panel";
import StatusBadge from "@/components/ui/StatusBadge";
import { getRepoRescueStatus, runRepoCompletionContract } from "@/services/repoRescue";

export default function RepoRescuePanel({ projectId }: { projectId: string }) {
  const [status, setStatus] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);
  const [request, setRequest] = useState("Analyze repository gaps and produce completion contract.");
  const [busy, setBusy] = useState(false);

  async function load() {
    try {
      const next = await getRepoRescueStatus(projectId);
      setStatus(next);
      setError(null);
    } catch (err: any) {
      setError(String(err?.message || err));
    }
  }

  useEffect(() => {
    void load();
    const t = setInterval(() => void load(), 6000);
    return () => clearInterval(t);
  }, [projectId]);

  return (
    <Panel title="Repo Rescue Surface">
      {error ? <div className="state-callout warning">{error}</div> : null}

      {status ? (
        <>
          <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginBottom: 8 }}>
            <StatusBadge status={status.existingRepoValidation?.ok ? "verified" : "needs attention"} />
            <StatusBadge status={Array.isArray(status.completionContract?.commercialLaunchBlockers) && status.completionContract.commercialLaunchBlockers.length === 0 ? "ready" : "blocked"} />
          </div>
          <div style={{ fontSize: 12, color: "var(--text-muted)" }}>
            Detected product: {status.completionContract?.detectedProduct || "unknown"}
          </div>
          <div style={{ fontSize: 12, color: "var(--text-muted)", marginBottom: 8 }}>
            Completion plan items: {Array.isArray(status.completionContract?.recommendedCompletionPlan) ? status.completionContract.recommendedCompletionPlan.length : 0}
          </div>
          {Array.isArray(status.completionContract?.commercialLaunchBlockers) && status.completionContract.commercialLaunchBlockers.length > 0 ? (
            <div className="state-callout error" style={{ marginBottom: 8 }}>
              Top blocker: {status.completionContract.commercialLaunchBlockers[0]}
            </div>
          ) : null}
        </>
      ) : (
        <div className="empty-state">No repo rescue status yet.</div>
      )}

      <div style={{ marginTop: 10 }}>
        <textarea
          value={request}
          onChange={(e) => setRequest(e.target.value)}
          rows={2}
          style={{ width: "100%", borderRadius: 10, border: "1px solid var(--border)", padding: 8, background: "var(--panel-soft)", color: "var(--text)" }}
        />
        <button
          style={{ marginTop: 8 }}
          disabled={busy}
          onClick={async () => {
            setBusy(true);
            try {
              await runRepoCompletionContract(projectId, request);
              await load();
            } finally {
              setBusy(false);
            }
          }}
        >
          {busy ? "Running..." : "Re-run Rescue Contract"}
        </button>
      </div>
    </Panel>
  );
}
