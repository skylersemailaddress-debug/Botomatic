import { useEffect, useRef, useState } from "react";
import Composer from "./Composer";
import MessageList from "./MessageList";
import QuickActionRow from "./QuickActionRow";
import { compileProject, planProject, executeNext } from "@/services/actions";
import { getProjectOverview } from "@/services/overview";

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
    if (!input.trim()) return;

    const userMsg = { id: Date.now().toString(), role: "operator", content: input, timestamp: new Date().toISOString() };
    setMessages((m) => [...m, userMsg]);
    setInput("");

    setLoading(true);

    try {
      await compileProject(projectId);
      setMessages((m) => [...m, { id: Date.now().toString(), role: "system", content: "Compile completed.", timestamp: new Date().toISOString() }]);

      await planProject(projectId);
      setMessages((m) => [...m, { id: Date.now().toString(), role: "system", content: "Plan generated.", timestamp: new Date().toISOString() }]);

      await executeNext(projectId);
      setMessages((m) => [...m, { id: Date.now().toString(), role: "system", content: "Execution started.", timestamp: new Date().toISOString() }]);
    } catch {
      setMessages((m) => [...m, { id: Date.now().toString(), role: "system", content: "Request failed.", timestamp: new Date().toISOString() }]);
    }

    setLoading(false);
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", height: "100%", padding: 16, gap: 16 }}>
      <div style={{ fontSize: 12, color: "var(--text-muted)" }}>Project {projectId}</div>
      <MessageList messages={messages} />
      <QuickActionRow projectId={projectId} />
      <Composer value={input} onChange={setInput} onSubmit={handleSubmit} disabled={loading} />
    </div>
  );
}
