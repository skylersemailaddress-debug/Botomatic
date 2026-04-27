import StatusBadge from "@/components/ui/StatusBadge";

export default function ProofStatusCard({
  title,
  status,
  detail,
}: {
  title: string;
  status: string;
  detail: string;
}) {
  return (
    <div className="proof-status-card">
      <div className="proof-status-header">
        <div className="proof-status-title">{title}</div>
        <StatusBadge status={status} />
      </div>
      <div className="proof-status-detail">{detail}</div>
    </div>
  );
}
