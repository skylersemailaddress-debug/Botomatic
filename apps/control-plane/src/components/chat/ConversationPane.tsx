"use client";

import { useEffect, useRef, useState } from "react";
import Composer from "./Composer";
import MessageList from "./MessageList";
import QuickActionRow from "./QuickActionRow";
import StatusBadge from "@/components/ui/StatusBadge";
import { getProjectOverview } from "@/services/overview";
import { uploadIntakeFile } from "@/services/intake";
import { sendOperatorMessage } from "@/services/operator";
import { getProjectAudit } from "@/services/audit";

export default function ConversationPane({ projectId }: { projectId: string }) {
  const [input, setInput] = useState("");
  const [messages, setMessages] = useState<any[]>([
    { id: "1", role: "system", content: "Botomatic is ready. No active run is in progress.", timestamp: new Date().toISOString() }
  ]);
  const [loading, setLoading] = useState(false);
  const [mode, setMode] = useState<string>("pending");
  const [routeStatus, setRouteStatus] = useState<string>("idle");
  const lastStatusRef = useRef<string | null>(null);

  useEffect(() => {
    let active = true;

    async function poll() {
      try {
        const overview: any = await getProjectOverview(projectId);
        const nextStatus = `${overview.latestRun.status}:${overview.summary.completedPackets}:${overview.summary.failedPackets}:${overview.readiness.status}`;
        setRouteStatus(overview.latestRun.status || "idle");

        if (active && lastStatusRef.current !== nextStatus) {
          lastStatusRef.current = nextStatus;

          let content = `Status: ${overview.latestRun.status}.`;
          if (overview.latestRun.status === "executing") {
            content = `Execution is in progress. ${overview.summary.completedPackets} of ${overview.summary.packetCount} packets are complete.`;
          } else if (overview.latestRun.status === "blocked") {
            content = overview.blockers?.[0] || "The current run is blocked.";
          } else if (overview.readiness.status === "ready") {
            content = "Validation passed. No blocking issues are currently reported.";
          } else if (overview.readiness.status === "not_started") {
            content = "Validation has not run. Launch readiness is unknown.";
          }

          setMode(
            overview.latestRun.status === "executing"
              ? "executing"
              : overview.latestRun.status === "blocked"
              ? "validating"
              : overview.readiness.status === "ready"
              ? "validating"
              : "analyzing"
          );

          setMessages((m) => [...m, {
            id: `${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
            role: "system",
            content,
            timestamp: new Date().toISOString(),
          }]);
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

  async function handleSubmit() {
    const message = input.trim();

    if (message) {
      const userMsg = { id: Date.now().toString(), role: "operator", content: message, timestamp: new Date().toISOString() };
      setMessages((m) => [...m, userMsg]);
    }
    setInput("");

    setLoading(true);
    setMode("executing");

    try {
      const response = await sendOperatorMessage(projectId, message);
      setMessages((m) => [...m, {
        id: Date.now().toString(),
        role: "system",
        content: response.operatorMessage,
        timestamp: new Date().toISOString(),
      }]);
    } catch (error: any) {
      setMessages((m) => [...m, {
        id: Date.now().toString(),
        role: "system",
        content: `Request failed: ${String(error?.message || error)}`,
        timestamp: new Date().toISOString(),
      }]);
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

      setMessages((m) => [...m, {
        id: `${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
        role: "system",
        content:
          result.message ||
          `Uploaded ${result.fileName}; extracted ${result.extractedChars} characters; available to planning.`,
        timestamp: new Date().toISOString(),
      }]);

      if ((result.binarySummary?.length || 0) > 0) {
        setMessages((m) => [...m, {
          id: `${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
          role: "system",
          content: `Binary files summarized: ${result.binarySummary?.length || 0}.`,
          timestamp: new Date().toISOString(),
        }]);
      }
    } finally {
      stopped = true;
      clearInterval(timer);
    }
  }

  return (
    <section className="chat-surface">
      <div className="chat-meta">
        <div className="chat-meta-title">Enterprise Operator Command Spine</div>
        <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
          <StatusBadge status={routeStatus} />
          <StatusBadge status={mode} />
          <StatusBadge status={loading ? "running" : "pending"} />
        </div>
      </div>
      <MessageList messages={messages} />
      <QuickActionRow projectId={projectId} />
      <Composer value={input} onChange={setInput} onSubmit={handleSubmit} onFileUpload={handleFileUpload} disabled={loading} />
    </section>
  );
}
