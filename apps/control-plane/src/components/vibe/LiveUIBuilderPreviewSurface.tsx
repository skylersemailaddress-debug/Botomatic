import React from "react";
import type { EditableUIDocument } from "../../../../../packages/ui-preview-engine/src/uiDocumentModel";
import { LiveUIBuilderDocumentRenderer } from "../live-ui-builder/LiveUIBuilderDocumentRenderer";
import { LiveUIBuilderInspectOverlay } from "../live-ui-builder/LiveUIBuilderInspectOverlay";
import { LiveUIBuilderDirectManipulationOverlay } from "../live-ui-builder/LiveUIBuilderDirectManipulationOverlay";

export function LiveUIBuilderPreviewSurface({ editableDocument, selectedNodeId, selectedPageId, changedNodeIds, previewPatch, onSelectNode, onDirectAction }: { editableDocument?: EditableUIDocument; selectedNodeId?: string; selectedPageId?: string; changedNodeIds?: string[]; previewPatch?: unknown; onSelectNode: (nodeId: string) => void; onDirectAction?: (action: any)=>void }) {
  if (!editableDocument) {
    return <article data-testid="live-ui-builder-preview-surface" data-preview-status="fallback"><p>Document-driven preview unavailable; using structural fallback only.</p></article>;
  }

  const hasPreviewPatch = Boolean(previewPatch && typeof previewPatch === "object" && Object.keys(previewPatch as Record<string, unknown>).length > 0);

  return (
    <article className="vibe-live-preview" aria-label="Live editable preview" data-testid="live-ui-builder-preview-surface" data-preview-status="document-driven">
      <header>
        <p>Live Preview Canvas</p>
        <p>{hasPreviewPatch ? "Preview updates ready" : "Awaiting next command"}</p>
      </header>
      <LiveUIBuilderDocumentRenderer editableDocument={editableDocument} selectedNodeId={selectedNodeId} changedNodeIds={changedNodeIds} onSelectNode={onSelectNode} />
      <LiveUIBuilderInspectOverlay selectedNodeId={selectedNodeId} changedNodeIds={changedNodeIds} onSelectNode={onSelectNode} />
      {onDirectAction && selectedPageId ? <LiveUIBuilderDirectManipulationOverlay selectedNodeId={selectedNodeId} pageId={selectedPageId} onAction={onDirectAction} /> : null}
    </article>
  );
}
