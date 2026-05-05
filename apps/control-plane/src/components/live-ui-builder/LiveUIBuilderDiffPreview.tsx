"use client";

export function LiveUIBuilderDiffPreview({ diff }: { diff?: { addedNodeIds?: string[]; removedNodeIds?: string[]; changedNodeIds?: string[] } }) {
  const added = diff?.addedNodeIds ?? [];
  const removed = diff?.removedNodeIds ?? [];
  const changed = diff?.changedNodeIds ?? [];
  return (
    <section className="live-ui-builder-diff-preview" aria-label="Planning-only diff preview">
      <h4>Planning-only diff preview</h4>
      <p>Added nodes: {added.length}</p>
      <p>Removed nodes: {removed.length}</p>
      <p>Changed nodes/text/props: {changed.length}</p>
    </section>
  );
}
