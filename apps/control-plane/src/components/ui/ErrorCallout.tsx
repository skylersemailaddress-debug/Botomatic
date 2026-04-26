export default function ErrorCallout({
  title = "Surface error",
  detail,
}: {
  title?: string;
  detail: string;
}) {
  return (
    <div className="state-callout error" role="alert">
      <strong>{title}:</strong> {detail}
    </div>
  );
}
