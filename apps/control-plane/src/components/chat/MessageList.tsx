export default function MessageList({ messages }: any) {
  return (
    <div className="message-list">
      {messages.map((m: any) => {
        const isSystem = m.role === "system";
        return (
          <div
            key={m.id}
            className={`message-bubble ${isSystem ? "system" : "operator"}`}
          >
            <div className="message-role">
              {isSystem ? "Botomatic system" : "Operator"}
            </div>
            <div className="message-content">{m.content}</div>
          </div>
        );
      })}
    </div>
  );
}
