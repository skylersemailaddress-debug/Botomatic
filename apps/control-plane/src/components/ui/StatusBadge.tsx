type Status = "idle" | "blocked" | "ready" | "failed" | "complete" | "pending" | string;

export default function StatusBadge({ status }: { status: Status }) {
  const normalized = String(status || "").toLowerCase();
  const map: Record<string, { text: string; bg: string; border: string; label?: string }> = {
    ready: {
      text: "var(--success)",
      bg: "rgba(20, 122, 75, 0.12)",
      border: "rgba(20, 122, 75, 0.32)",
      label: "ready",
    },
    complete: {
      text: "var(--success)",
      bg: "rgba(20, 122, 75, 0.12)",
      border: "rgba(20, 122, 75, 0.32)",
      label: "complete",
    },
    passed: {
      text: "var(--success)",
      bg: "rgba(20, 122, 75, 0.12)",
      border: "rgba(20, 122, 75, 0.32)",
      label: "passed",
    },
    verified: {
      text: "var(--success)",
      bg: "rgba(20, 122, 75, 0.12)",
      border: "rgba(20, 122, 75, 0.32)",
      label: "validator-backed",
    },
    blocked: {
      text: "var(--blocked)",
      bg: "rgba(183, 55, 55, 0.12)",
      border: "rgba(183, 55, 55, 0.32)",
      label: "blocked",
    },
    failed: {
      text: "var(--danger)",
      bg: "rgba(183, 55, 55, 0.12)",
      border: "rgba(183, 55, 55, 0.32)",
      label: "failed",
    },
    running: {
      text: "var(--info)",
      bg: "rgba(31, 111, 185, 0.12)",
      border: "rgba(31, 111, 185, 0.3)",
      label: "running",
    },
    executing: {
      text: "var(--active)",
      bg: "rgba(14, 92, 168, 0.12)",
      border: "rgba(14, 92, 168, 0.3)",
      label: "executing",
    },
    analyzing: {
      text: "var(--info)",
      bg: "rgba(31, 111, 185, 0.12)",
      border: "rgba(31, 111, 185, 0.3)",
      label: "analyzing",
    },
    planning: {
      text: "var(--info)",
      bg: "rgba(31, 111, 185, 0.12)",
      border: "rgba(31, 111, 185, 0.3)",
      label: "planning",
    },
    validating: {
      text: "var(--info)",
      bg: "rgba(31, 111, 185, 0.12)",
      border: "rgba(31, 111, 185, 0.3)",
      label: "validating",
    },
    pending: {
      text: "var(--warning)",
      bg: "rgba(156, 106, 0, 0.1)",
      border: "rgba(156, 106, 0, 0.28)",
      label: "pending",
    },
    not_started: {
      text: "var(--warning)",
      bg: "rgba(156, 106, 0, 0.1)",
      border: "rgba(156, 106, 0, 0.28)",
      label: "not started",
    },
    warning: {
      text: "var(--warning)",
      bg: "rgba(156, 106, 0, 0.1)",
      border: "rgba(156, 106, 0, 0.28)",
      label: "warning",
    },
    "needs attention": {
      text: "var(--warning)",
      bg: "rgba(156, 106, 0, 0.1)",
      border: "rgba(156, 106, 0, 0.28)",
      label: "needs attention",
    },
    "generated-app-build": {
      text: "var(--info)",
      bg: "rgba(31, 111, 185, 0.12)",
      border: "rgba(31, 111, 185, 0.3)",
      label: "generated app build",
    },
    "repo-rescue": {
      text: "var(--warning)",
      bg: "rgba(156, 106, 0, 0.1)",
      border: "rgba(156, 106, 0, 0.28)",
      label: "repo rescue",
    },
    "self-upgrade": {
      text: "var(--danger)",
      bg: "rgba(183, 55, 55, 0.12)",
      border: "rgba(183, 55, 55, 0.32)",
      label: "self-upgrade",
    },
    "deployment-readiness": {
      text: "var(--active)",
      bg: "rgba(14, 92, 168, 0.12)",
      border: "rgba(14, 92, 168, 0.3)",
      label: "deployment readiness",
    },
    "validation-proof": {
      text: "var(--success)",
      bg: "rgba(20, 122, 75, 0.12)",
      border: "rgba(20, 122, 75, 0.32)",
      label: "validation / proof",
    },
    "general-planning": {
      text: "var(--text-muted)",
      bg: "var(--surface-muted)",
      border: "var(--border)",
      label: "general planning",
    },
    generated_app_build: {
      text: "var(--info)",
      bg: "rgba(31, 111, 185, 0.12)",
      border: "rgba(31, 111, 185, 0.3)",
      label: "generated app build",
    },
    repo_rescue: {
      text: "var(--warning)",
      bg: "rgba(156, 106, 0, 0.1)",
      border: "rgba(156, 106, 0, 0.28)",
      label: "repo rescue",
    },
    self_upgrade: {
      text: "var(--danger)",
      bg: "rgba(183, 55, 55, 0.12)",
      border: "rgba(183, 55, 55, 0.32)",
      label: "self-upgrade",
    },
    deployment_readiness: {
      text: "var(--active)",
      bg: "rgba(14, 92, 168, 0.12)",
      border: "rgba(14, 92, 168, 0.3)",
      label: "deployment readiness",
    },
    validation_proof: {
      text: "var(--success)",
      bg: "rgba(20, 122, 75, 0.12)",
      border: "rgba(20, 122, 75, 0.32)",
      label: "validation / proof",
    },
    blocker_resolution: {
      text: "var(--warning)",
      bg: "rgba(156, 106, 0, 0.1)",
      border: "rgba(156, 106, 0, 0.28)",
      label: "blocker resolution",
    },
    status_query: {
      text: "var(--text-muted)",
      bg: "var(--surface-muted)",
      border: "var(--border)",
      label: "status query",
    },
    general_chat: {
      text: "var(--text-muted)",
      bg: "var(--surface-muted)",
      border: "var(--border)",
      label: "general chat",
    },
    secrets_vault: {
      text: "var(--warning)",
      bg: "rgba(156, 106, 0, 0.1)",
      border: "rgba(156, 106, 0, 0.28)",
      label: "secrets vault",
    },
    intake: {
      text: "var(--info)",
      bg: "rgba(31, 111, 185, 0.12)",
      border: "rgba(31, 111, 185, 0.3)",
      label: "intake",
    },
  };

  const style = map[normalized] || {
    text: "var(--text-muted)",
    bg: "var(--surface-muted)",
    border: "var(--border)",
    label: normalized.replace(/_/g, " ") || "unknown",
  };

  return (
    <span
      style={{
        fontSize: 11,
        padding: "5px 9px",
        borderRadius: 999,
        background: style.bg,
        color: style.text,
        border: `1px solid ${style.border}`,
        textTransform: "capitalize",
        fontWeight: 760,
        letterSpacing: "0.01em",
      }}
    >
      {style.label}
    </span>
  );
}
