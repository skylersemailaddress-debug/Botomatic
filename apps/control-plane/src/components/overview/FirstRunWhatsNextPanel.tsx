"use client";

import { useState, type ChangeEvent } from "react";
import Panel from "@/components/ui/Panel";
import ErrorCallout from "@/components/ui/ErrorCallout";
import EmptyState from "@/components/ui/EmptyState";
import { sendOperatorMessage } from "@/services/operator";
import { uploadIntakeFile } from "@/services/intake";
import { ACCEPTED_UPLOAD_ACCEPT_ATTR, formatMaxUploadLabel } from "@/services/intakeConfig";

const QUICK_ACTIONS = [
  { label: "Build from idea", message: "Build from idea and generate launch-ready contract." },
  { label: "Configure keys", message: "Configure keys and show secret requirements for this project." },
  { label: "Launch locally", message: "Prepare local launch package and launch locally." },
  { label: "Prepare deployment", message: "Prepare deployment plan with approval-gated live deployment." },
];

export default function FirstRunWhatsNextPanel({ projectId }: { projectId: string }) {
  const [error, setError] = useState<string | null>(null);
  const [lastResult, setLastResult] = useState<string>("");
  const [busy, setBusy] = useState(false);
  const [uploadProgress, setUploadProgress] = useState<number>(0);

  async function runMessage(message: string) {
    setBusy(true);
    setError(null);
    try {
      const response = await sendOperatorMessage(projectId, message);
      setLastResult(`${response.route}: ${response.nextAction}`);
    } catch (e: any) {
      setError(e.message || "Action failed.");
    } finally {
      setBusy(false);
    }
  }

  async function onUpload(event: ChangeEvent<HTMLInputElement>, mode: "spec" | "repo") {
    const file = event.target.files?.[0];
    if (!file) return;
    setBusy(true);
    setError(null);
    setUploadProgress(0);
    try {
      await uploadIntakeFile(projectId, file, {
        onUploadProgress: (progressPercent) => setUploadProgress(progressPercent),
      });
      const message = mode === "spec"
        ? "Uploaded spec zip. Continue build from uploaded complex spec."
        : "Uploaded dirty repo zip. Generate completion contract and repair plan.";
      const response = await sendOperatorMessage(projectId, message);
      setLastResult(`${response.route}: ${response.nextAction}`);
    } catch (e: any) {
      setError(e.message || "Upload failed.");
    } finally {
      setBusy(false);
      event.target.value = "";
    }
  }

  return (
    <Panel title="First-Run + What's Next" subtitle="Onboarding path that just works from idea to deployment prep">
      {error ? <ErrorCallout title="First-run action error" detail={error} /> : null}

      <div className="surface-grid-2">
        <div className="proof-status-card">
          <div className="proof-status-title">Start here</div>
          <div className="proof-status-detail">Build from idea, upload spec zip, upload dirty repo, configure keys, launch locally, then prepare deployment.</div>
          <div style={{ display: "grid", gap: 8, marginTop: 8 }}>
            {QUICK_ACTIONS.map((action) => (
              <button key={action.label} disabled={busy} onClick={() => void runMessage(action.message)}>
                {busy ? "Working..." : action.label}
              </button>
            ))}
          </div>
        </div>

        <div className="proof-status-card">
          <div className="proof-status-title">Upload inputs</div>
          <div className="proof-status-detail">Max upload: {formatMaxUploadLabel()}</div>
          <label>
            Upload spec zip
            <input type="file" accept={ACCEPTED_UPLOAD_ACCEPT_ATTR} onChange={(event) => void onUpload(event, "spec")} />
          </label>
          <label style={{ marginTop: 8, display: "block" }}>
            Upload dirty repo
            <input type="file" accept={ACCEPTED_UPLOAD_ACCEPT_ATTR} onChange={(event) => void onUpload(event, "repo")} />
          </label>
          {busy ? <div className="proof-status-detail">Upload progress: {uploadProgress}%</div> : null}
          <div className="state-callout warning" style={{ marginTop: 8 }}>
            Live deployment remains approval-gated and blocked by default in first-run mode.
          </div>
          <div className="proof-status-detail" style={{ marginTop: 8 }}>
            For very large repos, prefer GitHub/cloud-link intake when available.
          </div>
        </div>
      </div>

      <div className="proof-status-card" style={{ marginTop: 10 }}>
        <div className="proof-status-title">What's next</div>
        {lastResult ? (
          <div className="proof-status-detail">{lastResult}</div>
        ) : (
          <EmptyState title="No action run yet" detail="Choose a first-run action to receive the next recommended step." />
        )}
      </div>
    </Panel>
  );
}
