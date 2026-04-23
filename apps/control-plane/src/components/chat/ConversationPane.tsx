import Composer from "./Composer";
import MessageList from "./MessageList";
import QuickActionRow from "./QuickActionRow";

const initialMessages = [
  { id: "1", role: "system", content: "Botomatic is ready. No active run is in progress.", timestamp: new Date().toISOString() },
  { id: "2", role: "system", content: "Use Compile to extract structure from messy input.", timestamp: new Date().toISOString() },
  { id: "3", role: "system", content: "Use Plan after compile output is available.", timestamp: new Date().toISOString() }
];

export default function ConversationPane({ projectId }: { projectId: string }) {
  return (
    <div style={{ display: "flex", flexDirection: "column", height: "100%", padding: 16, gap: 16 }}>
      <div style={{ fontSize: 12, color: "var(--text-muted)" }}>Project {projectId} • Idle • Readiness blocked</div>
      <MessageList messages={initialMessages} />
      <QuickActionRow projectId={projectId} />
      <Composer />
    </div>
  );
}
