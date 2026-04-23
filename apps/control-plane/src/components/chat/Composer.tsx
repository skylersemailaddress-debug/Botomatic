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
    <div style={{ display: "flex", gap: 8 }}>
      <input
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder="Describe what you want Botomatic to build or fix."
        disabled={disabled}
        style={{ flex: 1, padding: 8, borderRadius: 6, border: "1px solid var(--border)", background: "var(--panel-2)", color: "var(--text)" }}
      />
      <button onClick={onSubmit} disabled={disabled || !value.trim()}>Send</button>
    </div>
  );
}
