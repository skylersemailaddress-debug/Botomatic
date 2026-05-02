"use client";

import { useEffect, useMemo, useState, type ChangeEvent } from "react";
import Panel from "@/components/ui/Panel";
import ErrorCallout from "@/components/ui/ErrorCallout";
import EmptyState from "@/components/ui/EmptyState";
import { uploadIntakeFile } from "@/services/intake";
import {
  createIntakeSource,
  intakeCloudLink,
  intakeGithub,
  intakeLocalManifest,
  intakePastedText,
  listIntakeSources,
  type IntakeSource,
} from "@/services/intakeSources";
import { ACCEPTED_UPLOAD_ACCEPT_ATTR } from "@/services/intakeConfig";

type LastAction = {
  label: string;
  detail: string;
  manifestPath?: string;
} | null;

const DEFAULT_LOCAL_MANIFEST = JSON.stringify(
  {
    sourceType: "local_folder_manifest",
    path: "./my-project",
    include: ["src/**", "package.json", "README.md"],
    exclude: ["node_modules/**", ".git/**", "dist/**"],
    intent: "Analyze local project structure before ingestion.",
  },
  null,
  2
);

export default function IntakeHubPanel({ projectId }: { projectId: string }) {
  const [sources, setSources] = useState<IntakeSource[]>([]);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [lastAction, setLastAction] = useState<LastAction>(null);

  const [githubUrl, setGithubUrl] = useState("");
  const [cloudUrl, setCloudUrl] = useState("");
  const [cloudHasCredentials, setCloudHasCredentials] = useState(false);
  const [cloudLargeApproval, setCloudLargeApproval] = useState(false);
  const [pastedText, setPastedText] = useState("");
  const [localManifestText, setLocalManifestText] = useState(DEFAULT_LOCAL_MANIFEST);
  const [existingProjectRef, setExistingProjectRef] = useState("");
  const [uploadProgress, setUploadProgress] = useState(0);

  const sourceCounts = useMemo(() => {
    const summary = {
      completed: 0,
      blocked: 0,
      processing: 0,
      failed: 0,
    };
    for (const source of sources) {
      if (source.status === "completed") summary.completed += 1;
      if (source.status === "blocked_requires_auth") summary.blocked += 1;
      if (source.status === "processing" || source.status === "routing" || source.status === "registered") summary.processing += 1;
      if (source.status === "failed" || source.status === "rejected") summary.failed += 1;
    }
    return summary;
  }, [sources]);

  async function refreshSources() {
    const response = await listIntakeSources(projectId);
    setSources(response.sources || []);
  }

  useEffect(() => {
    void (async () => {
      try {
        setError(null);
        await refreshSources();
      } catch (e: any) {
        setError(e.message || "Unable to load intake sources.");
      }
    })();
  }, [projectId]);

  async function runAction(label: string, handler: () => Promise<{ message?: string; manifestPath?: string }>) {
    setBusy(true);
    setError(null);
    try {
      const result = await handler();
      await refreshSources();
      setLastAction({
        label,
        detail: result.message || "Source intake action completed.",
        manifestPath: result.manifestPath,
      });
    } catch (e: any) {
      setError(e.message || "Intake action failed.");
    } finally {
      setBusy(false);
    }
  }

  async function onUploadFile(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    if (!file) return;

    setBusy(true);
    setError(null);
    setUploadProgress(0);
    try {
      const response = await uploadIntakeFile(projectId, file, {
        onUploadProgress: (value) => setUploadProgress(value),
      });
      await refreshSources();
      setLastAction({
        label: "Local upload",
        detail: response.message || `${response.fileName} uploaded and processed.`,
      });
    } catch (e: any) {
      setError(e.message || "File upload failed.");
    } finally {
      setBusy(false);
      event.target.value = "";
    }
  }

  return (
    <Panel title="Intake Hub" subtitle="Register and process project inputs from upload, GitHub, cloud links, pasted text, and local manifests">
      {error ? <ErrorCallout title="Intake Hub error" detail={error} /> : null}

      <div className="surface-grid-2">
        <div className="proof-status-card">
          <div className="proof-status-title">Source status</div>
          <div className="proof-status-detail" style={{ marginTop: 8 }}>
            Completed: {sourceCounts.completed} · Processing: {sourceCounts.processing} · Blocked: {sourceCounts.blocked} · Failed: {sourceCounts.failed}
          </div>
          <div style={{ marginTop: 8 }}>
            <label>
              Upload file/zip/pdf
              <input suppressHydrationWarning type="file" accept={ACCEPTED_UPLOAD_ACCEPT_ATTR} onChange={(event) => void onUploadFile(event)} disabled={busy} />
            </label>
            {busy && uploadProgress > 0 ? <div className="proof-status-detail">Upload progress: {uploadProgress}%</div> : null}
          </div>
        </div>

        <div className="proof-status-card">
          <div className="proof-status-title">GitHub source</div>
          <label>
            GitHub URL
            <input suppressHydrationWarning value={githubUrl} onChange={(event) => setGithubUrl(event.target.value)} placeholder="https://github.com/owner/repo or /tree/branch or /pull/123" />
          </label>
          <div style={{ marginTop: 8 }}>
            <button
              disabled={busy || !githubUrl.trim()}
              onClick={() =>
                void runAction("GitHub intake", () => intakeGithub(projectId, { sourceUrl: githubUrl.trim(), allowClone: true }))
              }
            >
              {busy ? "Working..." : "Intake from GitHub"}
            </button>
          </div>
        </div>
      </div>

      <div className="surface-grid-2" style={{ marginTop: 10 }}>
        <div className="proof-status-card">
          <div className="proof-status-title">Cloud link source</div>
          <label>
            Cloud URL
            <input suppressHydrationWarning value={cloudUrl} onChange={(event) => setCloudUrl(event.target.value)} placeholder="https://drive.google.com/... or https://dropbox.com/..." />
          </label>
          <label style={{ marginTop: 8, display: "block" }}>
            <input suppressHydrationWarning type="checkbox" checked={cloudHasCredentials} onChange={(event) => setCloudHasCredentials(event.target.checked)} /> I have connector credentials
          </label>
          <label style={{ marginTop: 4, display: "block" }}>
            <input suppressHydrationWarning type="checkbox" checked={cloudLargeApproval} onChange={(event) => setCloudLargeApproval(event.target.checked)} /> Approve large download
          </label>
          <div style={{ marginTop: 8 }}>
            <button
              disabled={busy || !cloudUrl.trim()}
              onClick={() =>
                void runAction("Cloud link intake", () =>
                  intakeCloudLink(projectId, {
                    sourceUrl: cloudUrl.trim(),
                    hasConnectorCredentials: cloudHasCredentials,
                    largeDownloadApproval: cloudLargeApproval,
                  })
                )
              }
            >
              {busy ? "Working..." : "Register cloud link"}
            </button>
          </div>
        </div>

        <div className="proof-status-card">
          <div className="proof-status-title">Pasted text source</div>
          <label>
            Pasted spec / notes
            <textarea suppressHydrationWarning value={pastedText} onChange={(event) => setPastedText(event.target.value)} rows={7} placeholder="Paste spec text, requirements, or implementation notes." />
          </label>
          <div style={{ marginTop: 8 }}>
            <button
              disabled={busy || !pastedText.trim()}
              onClick={() => void runAction("Pasted text intake", () => intakePastedText(projectId, pastedText.trim(), "Pasted project input"))}
            >
              {busy ? "Working..." : "Ingest pasted text"}
            </button>
          </div>
        </div>
      </div>

      <div className="surface-grid-2" style={{ marginTop: 10 }}>
        <div className="proof-status-card">
          <div className="proof-status-title">Local folder manifest</div>
          <label>
            botomatic-intake.json payload
            <textarea suppressHydrationWarning value={localManifestText} onChange={(event) => setLocalManifestText(event.target.value)} rows={10} />
          </label>
          <div style={{ marginTop: 8 }}>
            <button
              disabled={busy || !localManifestText.trim()}
              onClick={() =>
                void runAction("Local manifest intake", async () => {
                  const parsed = JSON.parse(localManifestText);
                  return intakeLocalManifest(projectId, parsed);
                })
              }
            >
              {busy ? "Working..." : "Register local manifest"}
            </button>
          </div>
        </div>

        <div className="proof-status-card">
          <div className="proof-status-title">Existing project reference</div>
          <label>
            Existing project URI
            <input
              suppressHydrationWarning
              value={existingProjectRef}
              onChange={(event) => setExistingProjectRef(event.target.value)}
              placeholder="project://legacy-system or https://internal.example/project/123"
            />
          </label>
          <div style={{ marginTop: 8 }}>
            <button
              disabled={busy || !existingProjectRef.trim()}
              onClick={() =>
                void runAction("Existing project reference", () =>
                  createIntakeSource(projectId, {
                    sourceType: "existing_project_reference",
                    sourceUri: existingProjectRef.trim(),
                    displayName: "Existing project reference",
                    provider: "internal",
                  })
                )
              }
            >
              {busy ? "Working..." : "Register existing project"}
            </button>
          </div>
        </div>
      </div>

      <div className="proof-status-card" style={{ marginTop: 10 }}>
        <div className="proof-status-title">Latest intake action</div>
        {lastAction ? (
          <>
            <div className="proof-status-detail" style={{ marginTop: 8 }}>
              {lastAction.label}: {lastAction.detail}
            </div>
            {lastAction.manifestPath ? <div className="text-subtle">Manifest: {lastAction.manifestPath}</div> : null}
          </>
        ) : (
          <EmptyState title="No intake action yet" detail="Use one of the source methods above to register intake context." />
        )}
      </div>

      <div className="proof-status-card" style={{ marginTop: 10 }}>
        <div className="proof-status-title">Registered intake sources</div>
        {sources.length === 0 ? (
          <EmptyState title="No sources registered" detail="Upload files or add GitHub/cloud/pasted/local-manifest sources to begin." />
        ) : (
          <ul className="list-plain" style={{ marginTop: 8 }}>
            {sources.slice(0, 25).map((source) => (
              <li key={source.sourceId}>
                {source.displayName} · {source.sourceType} · {source.status} · {source.ingestionMode}
              </li>
            ))}
          </ul>
        )}
      </div>
    </Panel>
  );
}
