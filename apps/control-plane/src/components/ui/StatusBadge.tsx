type Status = "idle" | "blocked" | "ready" | "failed" | "complete" | "pending" | string;

export default function StatusBadge({ status }: { status: Status }) {
  const color =
    status === "ready" || status === "complete"
      ? "#16a34a"
      : status === "blocked" || status === "failed"
      ? "#dc2626"
      : status === "pending"
      ? "#f59e0b"
      : "#6b7280";

  return (
    <span
      style={{
        fontSize: 11,
        padding: "2px 6px",
        borderRadius: 999,
        background: "rgba(255,255,255,0.04)",
        color,
      }}
    >
      {status}
    </span>
  );
}
