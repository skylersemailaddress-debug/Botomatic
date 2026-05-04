"use client";

import { useEffect, useRef, useState } from "react";
import Composer, { type UploadBatchResult } from "./Composer";
import MessageList from "./MessageList";
import StatusBadge from "@/components/ui/StatusBadge";
import { uploadIntakeFile } from "@/services/intake";
import { getProjectAudit } from "@/services/audit";
import {
  buildPartnerEnvelope,
  executeCanonicalCommand,
  fetchRuntimeContext,
  normalizeUploadedFileIntake,
  runPipelineFromIntakeContext,
} from "./chatCommandExecutor";
import { classifyError } from "./systemIntelligence";
import { type CommandIntent } from "./intentRouting";

type ChatMessage = {
  id: string;
  role: "system" | "operator";
  content: string;
  timestamp: string;
};

export default function ConversationPane({ projectId }: { projectId: string }) {
  const [input, setInput] = useState("");
  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      id: "1",
      role: "system",
      content: "Botomatic is ready. No active run is in progress. Share a goal, upload a file, paste a spec, drop a repo URL, or use commands like: continue build, validate, explain blocker, approve plan, show proof, fix failure.",
      timestamp: new Date().toISOString(),
    }
  ]);
  const [loading, setLoading] = useState(false);
  const [mode, setMode] = useState<string>("pending");
  const [routeStatus, setRouteStatus] = useState<string>("idle");
  const [classification, setClassification] = useState<CommandIntent>("generated_app_build");
  const lastStatusRef = useRef<string | null>(null);

  useEffect(() => {
    if (!projectId) return;

    // SSE — real-time push from the orchestrator
    const es = new EventSource(`/api/projects/${projectId}/stream`);
    let sseConnected = false;

    es.addEventListener("open", () => {
      sseConnected = true;
    });

    es.addEventListener("packet_complete", (e: MessageEvent) => {
      try {
        const data = JSON.parse(e.data) as { packetId: string; status: string };
        setRouteStatus("executing");
        appendSystemMessage(`Packet complete: ${data.packetId} — status: ${data.status}`);
      } catch { /* ignore parse errors */ }
    });

    es.addEventListener("packet_failed", (e: MessageEvent) => {
      try {
        const data = JSON.parse(e.data) as { packetId: string; error: string };
        setRouteStatus("blocked");
        setMode("validating");
        appendSystemMessage(`Packet failed: ${data.packetId} — ${data.error}`);
      } catch { /* ignore */ }
    });

    es.addEventListener("ui_mutation", (e: MessageEvent) => {
      try {
        const data = JSON.parse(e.data) as { command: string; patch: unknown };
        appendSystemMessage(`UI updated: "${data.command}"`);
      } catch { /* ignore */ }
    });

    es.addEventListener("capability_synthesized", (e: MessageEvent) => {
      try {
        const data = JSON.parse(e.data) as { id: string; domain: string };
        appendSystemMessage(`New capability synthesized: ${data.domain} (id: ${data.id})`);
      } catch { /* ignore */ }
    });

    es.addEventListener("status", (e: MessageEvent) => {
      try {
        const data = JSON.parse(e.data) as { projectStatus: string; validationStatus?: string };
        setRouteStatus(data.projectStatus || "idle");
        setMode(
          data.projectStatus === "executing"
            ? "executing"
            : data.projectStatus === "blocked"
            ? "validating"
            : data.validationStatus === "ready"
            ? "validating"
            : "analyzing"
        );
      } catch { /* ignore */ }
    });

    es.onerror = () => {
      // SSE connection dropped — fall back to a single poll to refresh state
      if (sseConnected) {
        void fetchRuntimeContext(projectId).then((runtime) => {
          setRouteStatus(runtime.projectStatus || "idle");
        }).catch(() => { /* ignore */ });
      }
    };

    // Initial state fetch (SSE carries deltas; we need the current snapshot on mount)
    void fetchRuntimeContext(projectId).then((runtime) => {
      setRouteStatus(runtime.projectStatus || "idle");
      setMode(
        runtime.projectStatus === "executing"
          ? "executing"
          : runtime.projectStatus === "blocked"
          ? "validating"
          : runtime.validationStatus === "ready"
          ? "validating"
          : "analyzing"
      );
      const content = buildPartnerEnvelope(
        runtime,
        "show current system state and next best action",
        "Telemetry refreshed from build and validation state."
      );
      const statusKey = [
        runtime.projectStatus,
        runtime.validationStatus,
        runtime.launchGateStatus,
        runtime.currentMilestone || "none",
        runtime.repairAttempts,
        runtime.blockers.join("|"),
      ].join(":");
      if (lastStatusRef.current !== statusKey) {
        lastStatusRef.current = statusKey;
        setMessages((m) => [
          ...m,
          {
            id: `${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
            role: "system",
            content,
            timestamp: new Date().toISOString(),
          },
        ]);
      }
    }).catch(() => { /* ignore initial fetch errors */ });

    return () => {
      es.close();
    };
  }, [projectId]);

  function appendSystemMessage(content: string) {
    setMessages((m) => [
      ...m,
      {
        id: `${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
        role: "system",
        content,
        timestamp: new Date().toISOString(),
      },
    ]);
  }

  async function handleSubmit() {
    const message = input.trim();
    if (!message) return;

    const userMsg: ChatMessage = {
      id: Date.now().toString(),
      role: "operator",
      content: message,
      timestamp: new Date().toISOString(),
    };
    setMessages((m) => [...m, userMsg]);
    setInput("");

    setLoading(true);
    setMode("executing");

    try {
      const runtime = await fetchRuntimeContext(projectId);
      const execution = await executeCanonicalCommand({
        projectId,
        input: message,
        runtimeContext: runtime,
      });
      setClassification(execution.intent);
      appendSystemMessage(buildPartnerEnvelope(runtime, execution.commandRun, execution.details));
    } catch (error: any) {
      const raw = String(error?.message || error);
      const classified = classifyError(raw);
      appendSystemMessage(
        `Request failed (${classified.className}): ${raw}\nRecommended command: ${classified.recommendedCommand}`
      );
    }

    setLoading(false);
    setMode("validating");
  }

  async function handleFileUpload(
    files: File[],
    hooks: {
      onFileProgress: (fileName: string, progressPercent: number) => void;
      onFileStatus: (fileName: string, statusText: string) => void;
      onBatchStatus: (statusText: string) => void;
    }
  ): Promise<UploadBatchResult> {
    if (files.length === 0) {
      return { failedFiles: [] };
    }

    const relevantTypes = new Set([
      "upload_started",
      "upload_received",
      "validation_started",
      "archive_scan_started",
      "extraction_started",
      "extraction_progress",
      "ingestion_started",
      "ingestion_completed",
      "ingestion_failed",
    ]);
    const seenEvents = new Set<string>();
    let stopped = false;

    const failedFiles: UploadBatchResult["failedFiles"] = [];
    const succeededFileNames: string[] = [];

    const pollAudit = async () => {
      if (stopped) return;
      try {
        const audit = await getProjectAudit(projectId);
        for (const event of audit.events || []) {
          if (!event?.id || seenEvents.has(event.id) || !relevantTypes.has(event.type)) {
            continue;
          }
          seenEvents.add(event.id);
          const metadata = (event as any).metadata || {};
          const eventFileName = String(metadata.fileName || "");
          if (event.type === "upload_started") hooks.onFileStatus(eventFileName, "Upload started");
          if (event.type === "upload_received") hooks.onFileStatus(eventFileName, "Upload received");
          if (event.type === "validation_started") hooks.onFileStatus(eventFileName, "Validation started");
          if (event.type === "archive_scan_started") hooks.onFileStatus(eventFileName, "Archive scan started");
          if (event.type === "extraction_started") hooks.onFileStatus(eventFileName, "Extraction started");
          if (event.type === "ingestion_started") hooks.onFileStatus(eventFileName, "Ingestion started");
          if (event.type === "ingestion_completed") hooks.onFileStatus(eventFileName, "Ingestion completed");
          if (event.type === "ingestion_failed") hooks.onFileStatus(eventFileName, "Ingestion failed");
          if (event.type === "extraction_progress") {
            const extractedBytes = Number(metadata.extractedBytes || 0);
            const maxExtractedBytes = Number(metadata.maxExtractedBytes || 0);
            const scannedEntries = Number(metadata.scannedEntries || 0);
            const extractedEntries = Number(metadata.extractedEntries || 0);
            if (maxExtractedBytes > 0) {
              const percent = Math.min(100, Math.round((extractedBytes / maxExtractedBytes) * 100));
              hooks.onFileStatus(eventFileName, `Extraction ${percent}% (${extractedEntries} files, scanned ${scannedEntries})`);
            } else {
              hooks.onFileStatus(eventFileName, `Extraction progress (${extractedEntries} files, scanned ${scannedEntries})`);
            }
          }
        }
      } catch {
        // keep upload flow resilient to transient audit polling errors
      }
    };

    void pollAudit();
    const timer = setInterval(() => {
      void pollAudit();
    }, 900);

    try {
      for (let index = 0; index < files.length; index++) {
        const file = files[index];
        hooks.onBatchStatus(`Uploading file ${index + 1}/${files.length}: ${file.name}`);
        hooks.onFileStatus(file.name, "Uploading");
        hooks.onFileProgress(file.name, 0);

        try {
          const result = await uploadIntakeFile(projectId, file, {
            onUploadProgress: (progressPercent) => hooks.onFileProgress(file.name, progressPercent),
          });

          succeededFileNames.push(result.fileName);
          hooks.onFileProgress(file.name, 100);
          hooks.onFileStatus(file.name, "Uploaded");

          appendSystemMessage(
            result.message ||
              `Uploaded ${result.fileName}; extracted ${result.extractedChars} characters; available to planning.`
          );

          if ((result.binarySummary?.length || 0) > 0) {
            appendSystemMessage(`Binary files summarized for ${result.fileName}: ${result.binarySummary?.length || 0}.`);
          }
        } catch (error: any) {
          const raw = String(error?.message || error);
          const classified = classifyError(raw);
          failedFiles.push({
            fileName: file.name,
            errorMsg: raw,
            className: classified.className,
          });
          hooks.onFileStatus(file.name, `Failed (${classified.className})`);
          appendSystemMessage(
            `Upload failed for ${file.name} (${classified.className}): ${raw}\nRecommended command: ${classified.recommendedCommand}`
          );
        }
      }

      if (failedFiles.length > 0) {
        hooks.onBatchStatus(`Uploaded ${succeededFileNames.length}/${files.length}; ${failedFiles.length} failed`);
        return { failedFiles };
      }

      try {
        hooks.onBatchStatus("All uploads complete. Compiling master truth.");
        const runtime = await fetchRuntimeContext(projectId);
        const intakeContext = normalizeUploadedFileIntake(succeededFileNames);
        const details = await runPipelineFromIntakeContext(projectId, intakeContext);
        setClassification("generated_app_build");
        appendSystemMessage(buildPartnerEnvelope(runtime, "continue current generated app build", details));
        hooks.onBatchStatus("Batch compile + plan completed");
        return { failedFiles: [] };
      } catch (pipelineError: any) {
        const raw = String(pipelineError?.message || pipelineError);
        const classified = classifyError(raw);
        appendSystemMessage(
          `Pipeline failed (${classified.className}): ${raw}\nRecommended command: ${classified.recommendedCommand}`
        );
        throw pipelineError;
      }
    } catch (error: any) {
      throw error;
    } finally {
      stopped = true;
      clearInterval(timer);
    }
  }

  return (
    <section className="chat-surface">
      <div className="chat-meta">
        <div className="chat-meta-title">Enterprise Builder Command Center</div>
        <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
          <StatusBadge status={classification} />
          <StatusBadge status={routeStatus} />
          <StatusBadge status={mode} />
          <StatusBadge status={loading ? "running" : "pending"} />
        </div>
      </div>
      <MessageList messages={messages} />
      <Composer
        value={input}
        onChange={setInput}
        onSubmit={handleSubmit}
        onFileUpload={handleFileUpload}
        disabled={loading}
      />
    </section>
  );
}
