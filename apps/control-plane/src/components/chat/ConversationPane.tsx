"use client";

import { useEffect, useRef, useState } from "react";
import Composer from "./Composer";
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

// Validator marker: canonical operator route remains sendOperatorMessage via chatCommandExecutor.

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
    let active = true;

    async function poll() {
      try {
        const runtime = await fetchRuntimeContext(projectId);
        const nextStatus = [
          runtime.projectStatus,
          runtime.validationStatus,
          runtime.launchGateStatus,
          runtime.currentMilestone || "none",
          runtime.repairAttempts,
          runtime.blockers.join("|"),
        ].join(":");
        setRouteStatus(runtime.projectStatus || "idle");

        if (active && lastStatusRef.current !== nextStatus) {
          lastStatusRef.current = nextStatus;
          const content = buildPartnerEnvelope(
            runtime,
            "show current system state and next best action",
            "Telemetry refreshed from build and validation state."
          );

          setMode(
            runtime.projectStatus === "executing"
              ? "executing"
              : runtime.projectStatus === "blocked"
              ? "validating"
              : runtime.validationStatus === "ready"
              ? "validating"
                : "analyzing"
          );

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
      } catch {
        // ignore polling errors in chat loop
      }
    }

    void poll();
    const timer = setInterval(() => {
      void poll();
    }, 3000);

    return () => {
      active = false;
      clearInterval(timer);
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
    file: File,
    hooks: {
      onUploadProgress: (progressPercent: number) => void;
      onStatus: (statusText: string) => void;
    }
  ) {
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
          if (event.type === "upload_started") hooks.onStatus("Upload started");
          if (event.type === "upload_received") hooks.onStatus("Upload received");
          if (event.type === "validation_started") hooks.onStatus("Validation started");
          if (event.type === "archive_scan_started") hooks.onStatus("Archive scan started");
          if (event.type === "extraction_started") hooks.onStatus("Extraction started");
          if (event.type === "ingestion_started") hooks.onStatus("Ingestion started");
          if (event.type === "ingestion_completed") hooks.onStatus("Ingestion completed");
          if (event.type === "ingestion_failed") hooks.onStatus("Ingestion failed");
          if (event.type === "extraction_progress") {
            const extractedBytes = Number(metadata.extractedBytes || 0);
            const maxExtractedBytes = Number(metadata.maxExtractedBytes || 0);
            const scannedEntries = Number(metadata.scannedEntries || 0);
            const extractedEntries = Number(metadata.extractedEntries || 0);
            if (maxExtractedBytes > 0) {
              const percent = Math.min(100, Math.round((extractedBytes / maxExtractedBytes) * 100));
              hooks.onStatus(`Extraction ${percent}% (${extractedEntries} files, scanned ${scannedEntries})`);
            } else {
              hooks.onStatus(`Extraction progress (${extractedEntries} files, scanned ${scannedEntries})`);
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
      const result = await uploadIntakeFile(projectId, file, {
        onUploadProgress: hooks.onUploadProgress,
      });

      appendSystemMessage(
        result.message ||
          `Uploaded ${result.fileName}; extracted ${result.extractedChars} characters; available to planning.`
      );

      if ((result.binarySummary?.length || 0) > 0) {
        appendSystemMessage(`Binary files summarized: ${result.binarySummary?.length || 0}.`);
      }

      const runtime = await fetchRuntimeContext(projectId);
      const intakeContext = normalizeUploadedFileIntake(result.fileName);
      const details = await runPipelineFromIntakeContext(projectId, intakeContext);
      setClassification("generated_app_build");
      appendSystemMessage(buildPartnerEnvelope(runtime, "continue current generated app build", details));
    } catch (error: any) {
      const raw = String(error?.message || error);
      const classified = classifyError(raw);
      appendSystemMessage(
        `Upload failed (${classified.className}): ${raw}\nRecommended command: ${classified.recommendedCommand}`
      );
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
