"use client";

import { useMemo } from "react";

export function LiveUIBuilderDiffPreview({ diff }: { diff?: { operations?: Array<{ kind: string; nodeId?: string }> } }) {
  const grouped = useMemo(() => {
    const ops = diff?.operations ?? [];
    return {
      added: ops.filter((op) => op.kind === "nodeAdded"),
      removed: ops.filter((op) => op.kind === "nodeRemoved"),
      changed: ops.filter((op) => ["nodeUpdated", "textUpdated", "styleUpdated", "layoutUpdated", "bindingUpdated"].includes(op.kind)),
    };
  }, [diff]);

  return (
    <section className="vibe-resolution-card" aria-label="Pre-confirm diff preview">
      <h3>Review before confirm</h3>
      <p>Confirmation-required change. Review before applying.</p>
      <div><strong>Added nodes:</strong> {(grouped.added.map((op) => op.nodeId).filter(Boolean).join(", ") || "none")}</div>
      <div><strong>Removed nodes:</strong> {(grouped.removed.map((op) => op.nodeId).filter(Boolean).join(", ") || "none")}</div>
      <div><strong>Changed nodes/text/props:</strong> {(grouped.changed.map((op) => `${op.kind}:${op.nodeId ?? "n/a"}`).join(", ") || "none")}</div>
      <p>Source sync remains planning-only; no source rewrite/export/deploy is performed.</p>
    </section>
  );
}
