import { useState } from "react";
import Composer from "./Composer";
import MessageList from "./MessageList";
import QuickActionRow from "./QuickActionRow";
import { compileProject, planProject, executeNext } from "@/services/actions";

export default function ConversationPane({ projectId }: { projectId: string }) {
  const [input, setInput] = useState("");
  const [messages, setMessages] = useState<any[]>([
    { id: "1", role: "system", content: "Botomatic is ready. No active run is in progress.", timestamp: new Date().toISOString() }
  ]);
  const [loading, setLoading] = useState(false);

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
    } catch (e: any) {
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
