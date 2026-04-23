export default function MessageList({ messages }: any) {
  return (
    <div style={{ flex: 1, overflowY: "auto", display: "flex", flexDirection: "column", gap: 8 }}>
      {messages.map((m: any) => (
        <div key={m.id} style={{ fontSize: 14 }}>
          <strong style={{ color: m.role === "system" ? "var(--accent)" : "var(--text-muted)" }}>
            {m.role === "system" ? "System" : "You"}
          </strong>
          <div>{m.content}</div>
        </div>
      ))}
    </div>
  );
}
