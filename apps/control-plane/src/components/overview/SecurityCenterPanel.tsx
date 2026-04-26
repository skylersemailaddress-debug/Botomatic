"use client";

import { useEffect, useState } from "react";
import Panel from "@/components/ui/Panel";
import EmptyState from "@/components/ui/EmptyState";
import ErrorCallout from "@/components/ui/ErrorCallout";
import LoadingSkeleton from "@/components/ui/LoadingSkeleton";
import { getSecurityCenter, runDependencyRiskScan, type SecurityCenterResponse } from "@/services/securityCenter";

export default function SecurityCenterPanel({ projectId }: { projectId: string }) {
  const [data, setData] = useState<SecurityCenterResponse | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function load() {
    try {
      const next = await getSecurityCenter(projectId);
      setData(next);
      setError(null);
    } catch (e: any) {
      setError(e.message || "Unable to load Security Center.");
    }
  }

  useEffect(() => {
    void load();
  }, [projectId]);

  async function onScan() {
    setBusy(true);
    try {
      await runDependencyRiskScan(projectId);
      await load();
    } catch (e: any) {
      setError(e.message || "Dependency scan failed.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <Panel title="Security Center" subtitle="Threat model, RBAC matrix, privacy, dependencies, supply chain, and audit log">
      {error ? <ErrorCallout title="Security Center error" detail={error} /> : null}
      {!data ? (
        <LoadingSkeleton rows={4} />
      ) : (
        <>
          <div className="row" style={{ marginBottom: 10 }}>
            <button onClick={onScan} disabled={busy}>{busy ? "Scanning..." : "Run dependency risk scan"}</button>
            <span className="text-subtle">High: {data.dependencyRisk.high} · Medium: {data.dependencyRisk.medium} · Low: {data.dependencyRisk.low}</span>
          </div>

          <div className="surface-grid-2">
            <div className="proof-status-card">
              <div className="proof-status-title">Threat model</div>
              <ul className="list-plain" style={{ marginTop: 8 }}>
                {data.threatModel.map((item) => <li key={item}>{item}</li>)}
              </ul>
            </div>
            <div className="proof-status-card">
              <div className="proof-status-title">RBAC matrix</div>
              <ul className="list-plain" style={{ marginTop: 8 }}>
                {data.rbacMatrix.map((row) => <li key={row.route}>{row.route}: {row.allowedRoles.join(", ")}</li>)}
              </ul>
            </div>
          </div>

          <div className="surface-grid-2" style={{ marginTop: 10 }}>
            <div className="proof-status-card">
              <div className="proof-status-title">Data privacy</div>
              <ul className="list-plain" style={{ marginTop: 8 }}>
                {data.dataPrivacy.map((item) => <li key={item}>{item}</li>)}
              </ul>
            </div>
            <div className="proof-status-card">
              <div className="proof-status-title">Supply chain</div>
              <ul className="list-plain" style={{ marginTop: 8 }}>
                <li>Lockfile present: {data.supplyChain.lockfilePresent ? "yes" : "no"}</li>
                <li>Trusted registries only: {data.supplyChain.trustedRegistriesOnly ? "yes" : "no"}</li>
                <li>Artifact signing planned: {data.supplyChain.artifactSigningPlanned ? "yes" : "no"}</li>
              </ul>
            </div>
          </div>

          <div className="proof-status-card" style={{ marginTop: 10 }}>
            <div className="proof-status-title">Audit log</div>
            {data.auditLog.length === 0 ? (
              <EmptyState title="No security audit events yet" detail="Security events appear here as scans and governance actions run." />
            ) : (
              <ul className="list-plain" style={{ marginTop: 8 }}>
                {data.auditLog.map((item) => (
                  <li key={item.id}>{item.timestamp} · {item.type} · {item.detail}</li>
                ))}
              </ul>
            )}
          </div>
        </>
      )}
    </Panel>
  );
}
