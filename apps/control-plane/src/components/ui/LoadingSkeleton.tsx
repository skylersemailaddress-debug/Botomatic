export default function LoadingSkeleton({ rows = 2 }: { rows?: number }) {
  return (
    <div className="skeleton-stack" aria-busy="true" aria-live="polite">
      {Array.from({ length: rows }).map((_, i) => (
        <div key={i} className="skeleton" />
      ))}
    </div>
  );
}
