"use client";

import { useEffect, useState } from "react";

type ChatMessage = {
  id: string;
  role: "system" | "operator";
  content: string;
  timestamp?: string;
};

function useClientMounted(): boolean {
  const [mounted, setMounted] = useState(false);
  useEffect(() => {
    setMounted(true);
  }, []);
  return mounted;
}

function formatMessageTime(timestamp: string | undefined, mounted: boolean): string {
  if (!timestamp || !mounted) return "";
  const parsed = new Date(timestamp);
  if (Number.isNaN(parsed.getTime())) return "";
  return parsed.toLocaleTimeString([], { hour: "numeric", minute: "2-digit", second: "2-digit" });
}

export default function MessageList({ messages }: { messages: ChatMessage[] }) {
  const mounted = useClientMounted();

  return (
    <div className="message-list">
      {messages.map((m) => {
        const isSystem = m.role === "system";
        const timestamp = formatMessageTime(m.timestamp, mounted);
        return (
          <div
            key={m.id}
            className={`message-bubble ${isSystem ? "system" : "operator"}`}
          >
            <div className="message-role" suppressHydrationWarning>
              {isSystem ? "Botomatic" : "You"}{timestamp ? ` · ${timestamp}` : ""}
            </div>
            <div className="message-content">{m.content}</div>
          </div>
        );
      })}
    </div>
  );
}
