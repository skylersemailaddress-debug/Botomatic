"use client";

import { useMemo, useState } from "react";
import Panel from "@/components/ui/Panel";
import StatusBadge from "@/components/ui/StatusBadge";
import EmptyState from "@/components/ui/EmptyState";
import ErrorCallout from "@/components/ui/ErrorCallout";
import {
  addSecretReference,
  buildDeploymentSecretPreflight,
  deleteSecretReference,
  disableSecretReference,
  listCredentialProfiles,
  listMissingRequiredSecrets,
  listSecretAuditEvents,
  listSecretReferences,
  rotateSecretReference,
  type DeploymentEnvironment,
  type ProviderId,
} from "@/services/secrets";

const ENVIRONMENTS: DeploymentEnvironment[] = ["dev", "staging", "prod"];

function fingerprintPreview(value: string): string {
  if (!value) {
    return "not-set";
  }
  if (value.length <= 10) {
    return `${value.slice(0, 2)}******`;
  }
  return `${value.slice(0, 4)}...${value.slice(-4)}`;
}

export default function SecretsCredentialsPanel({ projectId }: { projectId: string }) {
  const [environment, setEnvironment] = useState<DeploymentEnvironment>("staging");
  const [providerId, setProviderId] = useState<ProviderId>("vercel");
  const [keyName, setKeyName] = useState("VERCEL_TOKEN");
  const [displayName, setDisplayName] = useState("Vercel deploy token");
  const [requiredFor, setRequiredFor] = useState("web_saas_app");
  const [secretValue, setSecretValue] = useState("");
  const [rotateValue, setRotateValue] = useState("");
  const [selectedRefId, setSelectedRefId] = useState<string>("");
  const [error, setError] = useState<string | null>(null);
  const [refreshTick, setRefreshTick] = useState(0);

  const profiles = useMemo(() => listCredentialProfiles(), [refreshTick]);
  const references = useMemo(
    () => listSecretReferences().filter((item) => item.environment === environment),
    [environment, refreshTick]
  );
  const auditEvents = useMemo(() => listSecretAuditEvents().slice(0, 6), [refreshTick]);
  const selectedProfile = useMemo(
    () => profiles.find((item) => item.providerId === providerId) || profiles[0],
    [profiles, providerId]
  );

  const missingRequired = useMemo(() => listMissingRequiredSecrets(environment), [environment, refreshTick]);
  const preflight = useMemo(() => buildDeploymentSecretPreflight(environment), [environment, refreshTick]);

  function refresh() {
    setRefreshTick((value) => value + 1);
  }

  function resetForm(nextProviderId: ProviderId) {
    const profile = profiles.find((item) => item.providerId === nextProviderId);
    const nextKey = profile?.requiredKeys[0] || "";
    setProviderId(nextProviderId);
    setKeyName(nextKey);
    setDisplayName(nextKey || "Secret reference");
  }

  function onAdd() {
    setError(null);
    try {
      addSecretReference({
        providerId,
        environment,
        keyName,
        displayName,
        requiredFor: requiredFor.split(",").map((value) => value.trim()).filter(Boolean),
        value: secretValue,
      });
      setSecretValue("");
      refresh();
    } catch (e: any) {
      setError(e.message || "Unable to add secret reference.");
    }
  }

  function onRotate() {
    if (!selectedRefId) {
      setError("Select a configured secret reference to rotate.");
      return;
    }
    setError(null);
    try {
      rotateSecretReference(selectedRefId, rotateValue);
      setRotateValue("");
      refresh();
    } catch (e: any) {
      setError(e.message || "Unable to rotate secret reference.");
    }
  }

  return (
    <Panel
      title="Secrets & Credentials"
      subtitle={`Project ${projectId} · metadata-only secret references`}
      footer={(
        <div className="state-callout warning">
          Secrets are never committed to this repository. Live deployment still requires explicit approval and remains blocked by default.
        </div>
      )}
    >
      <div className="row" style={{ marginBottom: 10 }}>
        <label className="text-muted" htmlFor="secret-env">Environment</label>
        <select
          id="secret-env"
          value={environment}
          onChange={(event) => setEnvironment(event.target.value as DeploymentEnvironment)}
        >
          {ENVIRONMENTS.map((env) => (
            <option key={env} value={env}>{env.toUpperCase()}</option>
          ))}
        </select>
        <StatusBadge status={preflight.status === "ready" ? "launch_satisfied" : "blocked_by_policy"} />
      </div>

      {error ? <ErrorCallout title="Secret operation error" detail={error} /> : null}

      <div className="surface-grid-2" style={{ marginTop: 10 }}>
        <div className="proof-status-card">
          <div className="proof-status-title">Credential profiles</div>
          <div className="proof-status-detail">{profiles.length} provider profiles are adapter-ready.</div>
          <ul className="list-plain" style={{ marginTop: 8 }}>
            {profiles.map((profile) => (
              <li key={profile.providerId}>
                {profile.displayName}: required {profile.requiredKeys.length}, optional {profile.optionalKeys.length}
              </li>
            ))}
          </ul>
        </div>

        <div className="proof-status-card">
          <div className="proof-status-title">Deployment preflight summary</div>
          <div className="proof-status-detail">Configured {preflight.configuredSecretCount} / required {preflight.requiredSecretCount}</div>
          <div className="proof-status-detail">Missing required: {preflight.missingSecretCount}</div>
          <div className="proof-status-detail">Rotation due: {preflight.rotationDueCount}</div>
          <div className="proof-status-detail">No plaintext values stored: {preflight.noPlaintextSecretValuesStored ? "yes" : "no"}</div>
        </div>
      </div>

      <div className="surface-grid-2" style={{ marginTop: 10 }}>
        <div className="proof-status-card">
          <div className="proof-status-title">Add or update secret reference</div>
          <div className="proof-status-detail">Value is accepted only at input time, fingerprinted, then discarded.</div>
          <div style={{ display: "grid", gap: 8, marginTop: 8 }}>
            <label>
              Provider
              <select
                value={providerId}
                onChange={(event) => resetForm(event.target.value as ProviderId)}
                style={{ width: "100%" }}
              >
                {profiles.map((profile) => (
                  <option key={profile.providerId} value={profile.providerId}>{profile.displayName}</option>
                ))}
              </select>
            </label>
            <label>
              Key name
              <select value={keyName} onChange={(event) => setKeyName(event.target.value)} style={{ width: "100%" }}>
                {[...(selectedProfile?.requiredKeys || []), ...(selectedProfile?.optionalKeys || [])].map((key) => (
                  <option key={key} value={key}>{key}</option>
                ))}
              </select>
            </label>
            <label>
              Display name
              <input value={displayName} onChange={(event) => setDisplayName(event.target.value)} style={{ width: "100%" }} />
            </label>
            <label>
              Required for (comma-separated)
              <input value={requiredFor} onChange={(event) => setRequiredFor(event.target.value)} style={{ width: "100%" }} />
            </label>
            <label>
              Secret value (never shown after save)
              <input
                type="password"
                value={secretValue}
                onChange={(event) => setSecretValue(event.target.value)}
                placeholder="Paste secret value"
                style={{ width: "100%" }}
              />
            </label>
            <div className="row">
              <button onClick={onAdd}>Add secret reference</button>
              <span className="text-subtle">Value preview: {fingerprintPreview(secretValue)}</span>
            </div>
          </div>
        </div>

        <div className="proof-status-card">
          <div className="proof-status-title">Rotate or disable</div>
          <div className="proof-status-detail">Rotation updates fingerprint and timestamp only.</div>
          <div style={{ display: "grid", gap: 8, marginTop: 8 }}>
            <label>
              Configured reference
              <select value={selectedRefId} onChange={(event) => setSelectedRefId(event.target.value)} style={{ width: "100%" }}>
                <option value="">Select secret reference</option>
                {references.map((ref) => (
                  <option key={ref.secretReferenceId} value={ref.secretReferenceId}>
                    {ref.providerId}/{ref.keyName} ({ref.status})
                  </option>
                ))}
              </select>
            </label>
            <label>
              New secret value for rotation
              <input
                type="password"
                value={rotateValue}
                onChange={(event) => setRotateValue(event.target.value)}
                placeholder="Provide new value"
                style={{ width: "100%" }}
              />
            </label>
            <div className="row">
              <button onClick={onRotate} disabled={!selectedRefId}>Rotate</button>
              <button
                onClick={() => {
                  if (!selectedRefId) return;
                  disableSecretReference(selectedRefId);
                  refresh();
                }}
                disabled={!selectedRefId}
              >
                Disable
              </button>
              <button
                onClick={() => {
                  if (!selectedRefId) return;
                  deleteSecretReference(selectedRefId);
                  setSelectedRefId("");
                  refresh();
                }}
                disabled={!selectedRefId}
              >
                Delete
              </button>
            </div>
            <div className="state-callout warning">
              External secret manager sync is adapter-ready but not connected in this UI pass.
            </div>
          </div>
        </div>
      </div>

      <div className="surface-grid-2" style={{ marginTop: 10 }}>
        <div className="proof-status-card">
          <div className="proof-status-title">Required key status</div>
          {missingRequired.length === 0 ? (
            <div className="state-callout success" style={{ marginTop: 8 }}>All required secret references are configured for {environment}.</div>
          ) : (
            <ul className="list-plain" style={{ marginTop: 8 }}>
              {missingRequired.slice(0, 16).map((item) => (
                <li key={`${item.providerId}-${item.keyName}`}>missing: {item.providerId}/{item.keyName}</li>
              ))}
            </ul>
          )}
        </div>

        <div className="proof-status-card">
          <div className="proof-status-title">Configured key status</div>
          {references.length === 0 ? (
            <EmptyState title="No configured secret references" detail="Add a secret reference to activate metadata-only tracking." />
          ) : (
            <ul className="list-plain" style={{ marginTop: 8 }}>
              {references.slice(0, 16).map((ref) => (
                <li key={ref.secretReferenceId}>
                  {ref.providerId}/{ref.environment}/{ref.keyName} · {ref.status} · fp {ref.fingerprint} · URI {ref.secretUri}
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>

      <div className="proof-status-card" style={{ marginTop: 10 }}>
        <div className="proof-status-title">Recent secret audit events (redacted)</div>
        {auditEvents.length === 0 ? (
          <EmptyState title="No secret audit events yet" detail="Events are created when references are added, updated, rotated, disabled, deleted, or preflight is checked." />
        ) : (
          <ul className="list-plain" style={{ marginTop: 8 }}>
            {auditEvents.map((event) => (
              <li key={event.eventId}>{event.occurredAt} · {event.type} · {event.detail}</li>
            ))}
          </ul>
        )}
      </div>
    </Panel>
  );
}
