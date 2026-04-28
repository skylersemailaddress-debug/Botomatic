"use client";

import { useSearchParams } from "next/navigation";

export default function ProductionPageShell({
  title,
  description,
}: {
  title: string;
  description: string;
}) {
  const params = useSearchParams();
  const view = (params.get("view") || "empty") as "empty" | "loading" | "error";

  return (
    <section className="nexus-page-shell">
      <header className="nexus-page-header">
        <h2>{title}</h2>
        <p>{description}</p>
      </header>

      {view === "loading" && (
        <div className="nexus-state nexus-state--loading">
          Loading… this page is not connected yet.
        </div>
      )}

      {view === "error" && (
        <div className="nexus-state nexus-state--error">
          Unable to load this page right now — not connected yet.
        </div>
      )}

      {view === "empty" && (
        <div className="nexus-state nexus-state--empty">
          This page is not connected yet.
        </div>
      )}

      <div className="nexus-page-hint">
        Use <code>?view=loading</code> or <code>?view=error</code> to inspect states.
      </div>
    </section>
  );
}
