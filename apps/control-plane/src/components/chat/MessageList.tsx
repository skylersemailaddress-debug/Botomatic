export default function MessageList({ messages }: any) {
  return (
    <div style={{ flex: 1, overflowY: "auto", paddingRight: 4, display: "flex", flexDirection: "column", gap: 12 }}>
      {messages.map((m: any) => {
        const isSystem = m.role === "system";
        return (
          <div
            key={m.id}
            style={{
              alignSelf: isSystem ? "flex-start" : "flex-end",
              maxWidth: "75%",
              padding: "10px 12px",
              borderRadius: 14,
              background: isSystem ? "var(--panel-soft)" : "var(--accent-soft)",
              border: "1px solid var(--border)",
            }}
          >
            <div style={{ fontSize: 11, color: "var(--text-subtle)", marginBottom: 4 }}>
              {isSystem ? "System" : "You"}
            </div>
            <div style={{ fontSize: 14, lineHeight: 1.5 }}>{m.content}</div>
          </div>
        );
      })}
    </div>
  );
}
