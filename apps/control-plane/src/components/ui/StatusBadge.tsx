type Status = "idle" | "blocked" | "ready" | "failed" | "complete" | "pending" | string;

export default function StatusBadge({ status }: { status: Status }) {
  const normalized = String(status || "").toLowerCase();
  const map: Record<string, { text: string; bg: string; border: string }> = {
    ready: { text: "var(--verified)", bg: "rgba(23, 133, 75, 0.12)", border: "rgba(23, 133, 75, 0.32)" },
    complete: { text: "var(--verified)", bg: "rgba(23, 133, 75, 0.12)", border: "rgba(23, 133, 75, 0.32)" },
    passed: { text: "var(--verified)", bg: "rgba(23, 133, 75, 0.12)", border: "rgba(23, 133, 75, 0.32)" },
    blocked: { text: "var(--blocked)", bg: "rgba(187, 45, 45, 0.12)", border: "rgba(187, 45, 45, 0.32)" },
    failed: { text: "var(--blocked)", bg: "rgba(187, 45, 45, 0.12)", border: "rgba(187, 45, 45, 0.32)" },
    running: { text: "var(--active)", bg: "rgba(0, 91, 181, 0.12)", border: "rgba(0, 91, 181, 0.3)" },
    executing: { text: "var(--active)", bg: "rgba(0, 91, 181, 0.12)", border: "rgba(0, 91, 181, 0.3)" },
    analyzing: { text: "var(--active)", bg: "rgba(0, 91, 181, 0.12)", border: "rgba(0, 91, 181, 0.3)" },
    planning: { text: "var(--active)", bg: "rgba(0, 91, 181, 0.12)", border: "rgba(0, 91, 181, 0.3)" },
    validating: { text: "var(--active)", bg: "rgba(0, 91, 181, 0.12)", border: "rgba(0, 91, 181, 0.3)" },
    pending: { text: "var(--pending)", bg: "rgba(127, 90, 240, 0.1)", border: "rgba(127, 90, 240, 0.28)" },
    not_started: { text: "var(--needs-attention)", bg: "rgba(162, 106, 0, 0.12)", border: "rgba(162, 106, 0, 0.3)" },
    warning: { text: "var(--needs-attention)", bg: "rgba(162, 106, 0, 0.12)", border: "rgba(162, 106, 0, 0.3)" },
  };

  const style = map[normalized] || {
    text: "var(--text-muted)",
    bg: "var(--panel-soft)",
    border: "var(--border)",
  };

  return (
    <span
      style={{
        fontSize: 11,
        padding: "4px 8px",
        borderRadius: 999,
        background: style.bg,
        color: style.text,
        border: `1px solid ${style.border}`,
        textTransform: "capitalize",
        fontWeight: 700,
      }}
    >
      {normalized.replace(/_/g, " ") || "unknown"}
    </span>
  );
}
