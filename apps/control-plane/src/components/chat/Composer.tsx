export default function Composer() {
  return (
    <div style={{ display: "flex", gap: 8 }}>
      <input
        placeholder="Describe what you want Botomatic to build or fix."
        style={{ flex: 1, padding: 8, borderRadius: 6, border: "1px solid var(--border)", background: "var(--panel-2)", color: "var(--text)" }}
      />
      <button>Send</button>
    </div>
  );
}
