import React from "react";
import type { EditableUIDocument } from "../../../../../packages/ui-preview-engine/src/uiDocumentModel";
import { LiveUIBuilderDocumentRenderer } from "../live-ui-builder/LiveUIBuilderDocumentRenderer";
import { LiveUIBuilderInspectOverlay } from "../live-ui-builder/LiveUIBuilderInspectOverlay";

export function LiveUIBuilderPreviewSurface({ editableDocument, selectedNodeId, changedNodeIds, previewPatch, onSelectNode }: { editableDocument?: EditableUIDocument; selectedNodeId?: string; changedNodeIds?: string[]; previewPatch?: unknown; onSelectNode: (nodeId: string) => void }) {
  if (!editableDocument) {
    return <article data-testid="live-ui-builder-preview-surface" data-preview-status="fallback"><p>Document-driven preview unavailable; using structural fallback only.</p></article>;
  }

  return (
    <article className="vibe-live-preview" aria-label="Live editable preview" data-testid="live-ui-builder-preview-surface" data-preview-status="document-driven">
      <header>
        <p>Document-driven preview, not final production rendering.</p>
        <p>Structural bridge caveat: preview model only; no source rewrite/export/deploy claims.</p>
      </header>
      <LiveUIBuilderDocumentRenderer editableDocument={editableDocument} selectedNodeId={selectedNodeId} changedNodeIds={changedNodeIds} onSelectNode={onSelectNode} />
      <LiveUIBuilderInspectOverlay selectedNodeId={selectedNodeId} changedNodeIds={changedNodeIds} onSelectNode={onSelectNode} />
      <pre>{JSON.stringify(previewPatch ?? {}, null, 2)}</pre>
    </article>
  );
}
