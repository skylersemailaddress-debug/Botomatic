"use client";

import { useEffect, useRef, useState } from "react";
import Composer from "./Composer";
import MessageList from "./MessageList";
import QuickActionRow from "./QuickActionRow";
import { getProjectOverview } from "@/services/overview";
import { uploadIntakeFile } from "@/services/intake";
import { sendOperatorMessage } from "@/services/operator";

export default function ConversationPane({ projectId }: { projectId: string }) {
  const [input, setInput] = useState("");
  const [messages, setMessages] = useState<any[]>([
    { id: "1", role: "system", content: "Botomatic is ready. No active run is in progress.", timestamp: new Date().toISOString() }
  ]);
  const [loading, setLoading] = useState(false);
  const lastStatusRef = useRef<string | null>(null);

  useEffect(() => {
    let active = true;

    async function poll() {
      try {
        const overview: any = await getProjectOverview(projectId);
        const nextStatus = `${overview.latestRun.status}:${overview.summary.completedPackets}:${overview.summary.failedPackets}:${overview.readiness.status}`;

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
  }

  async function handleFileUpload(file: File) {
    const result = await uploadIntakeFile(projectId, file);
    setMessages((m) => [...m, {
      id: `${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
      role: "system",
      content: result.message || `Uploaded ${result.fileName}; extracted ${result.extractedChars} characters; available to planning.`,
      timestamp: new Date().toISOString(),
    }]);
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", height: "100%", padding: 16, gap: 16 }}>
      <div style={{ fontSize: 12, color: "var(--text-muted)" }}>Project {projectId}</div>
      <MessageList messages={messages} />
      <QuickActionRow projectId={projectId} />
      <Composer value={input} onChange={setInput} onSubmit={handleSubmit} onFileUpload={handleFileUpload} disabled={loading} />
    </div>
  );
}
