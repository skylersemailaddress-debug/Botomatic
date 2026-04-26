type DomainCoverage = {
  domainId: string;
  status: "passed" | "blocked" | "pending" | string;
};

export default function DomainCoverageGrid({ rows }: { rows: DomainCoverage[] }) {
  return (
    <div className="domain-grid" aria-label="Domain coverage grid">
      {rows.map((row) => (
        <div key={row.domainId} className="domain-grid-item">
          <div className="domain-grid-name">{row.domainId.replace(/_/g, " ")}</div>
          <div className={`domain-grid-status is-${String(row.status).toLowerCase()}`}>{row.status}</div>
        </div>
      ))}
    </div>
  );
}
