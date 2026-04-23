export default function Composer({
  value,
  onChange,
  onSubmit,
  disabled,
}: {
  value: string;
  onChange: (value: string) => void;
  onSubmit: () => void;
  disabled?: boolean;
}) {
  return (
    <div
      style={{
        display: "flex",
        gap: 8,
        padding: 10,
        borderRadius: 16,
        background: "var(--panel-soft)",
        border: "1px solid var(--border)",
      }}
    >
      <input
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder="Describe what you want Botomatic to build or fix"
        disabled={disabled}
        style={{
          flex: 1,
          padding: "10px 12px",
          borderRadius: 10,
          border: "1px solid var(--border)",
          background: "var(--bg-elevated)",
          color: "var(--text)",
          outline: "none",
        }}
      />
      <button onClick={onSubmit} disabled={disabled || !value.trim()}>
        Send
      </button>
    </div>
  );
}
