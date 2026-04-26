type MetricCardProps = {
  label: string;
  value: string | number;
  tone?: "default" | "success" | "warning" | "danger" | "info";
  hint?: string;
};

export default function MetricCard({ label, value, tone = "default", hint }: MetricCardProps) {
  return (
    <div className={`metric-card metric-card--${tone}`}>
      <div className="metric-label">{label}</div>
      <div className="metric-value">{value}</div>
      {hint ? <div className="metric-hint">{hint}</div> : null}
    </div>
  );
}
