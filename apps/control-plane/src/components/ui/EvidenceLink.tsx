export default function EvidenceLink({
  href,
  label,
}: {
  href: string;
  label: string;
}) {
  return (
    <a className="evidence-link" href={href} target="_blank" rel="noreferrer">
      {label}
    </a>
  );
}
