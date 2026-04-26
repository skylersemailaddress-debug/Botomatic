export default function EmptyState({
  title,
  detail,
}: {
  title: string;
  detail?: string;
}) {
  return (
    <div className="empty-state" role="status" aria-live="polite">
      <div className="empty-state-title">{title}</div>
      {detail ? <div className="empty-state-detail">{detail}</div> : null}
    </div>
  );
}
