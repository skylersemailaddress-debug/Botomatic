import React from "react";
import type { EditableUIDocument } from "../../../../../packages/ui-preview-engine/src/uiDocumentModel";
import { LiveUIBuilderDocumentRenderer } from "../live-ui-builder/LiveUIBuilderDocumentRenderer";
import { LiveUIBuilderInspectOverlay } from "../live-ui-builder/LiveUIBuilderInspectOverlay";
import { LiveUIBuilderDirectManipulationOverlay } from "../live-ui-builder/LiveUIBuilderDirectManipulationOverlay";

export function LiveUIBuilderPreviewSurface({ editableDocument, selectedNodeId, selectedPageId, changedNodeIds, previewPatch, onSelectNode, onDirectAction }: { editableDocument?: EditableUIDocument; selectedNodeId?: string; selectedPageId?: string; changedNodeIds?: string[]; previewPatch?: unknown; onSelectNode: (nodeId: string) => void; onDirectAction?: (action: any)=>void }) {
  if (!editableDocument) {
    return (
      <article className="vibe-live-preview vibe-live-preview-empty" data-testid="live-ui-builder-preview-surface" data-preview-status="fallback">
        <h3>Preview pending</h3>
        <p>Waiting for first prompt to generate the live canvas.</p>
        <small>Not started</small>
      </article>
    );
  }

  return (
    <article className="vibe-live-preview" aria-label="Live editable preview" data-testid="live-ui-builder-preview-surface" data-preview-status="document-driven">
      <header>
        <p>Builder canvas</p>
        <small>{previewPatch ? "Pending visual updates" : "No pending patches"}</small>
      </header>
      <LiveUIBuilderDocumentRenderer editableDocument={editableDocument} selectedNodeId={selectedNodeId} changedNodeIds={changedNodeIds} onSelectNode={onSelectNode} />
      <LiveUIBuilderInspectOverlay selectedNodeId={selectedNodeId} changedNodeIds={changedNodeIds} onSelectNode={onSelectNode} />
      {onDirectAction && selectedPageId ? <LiveUIBuilderDirectManipulationOverlay selectedNodeId={selectedNodeId} pageId={selectedPageId} onAction={onDirectAction} /> : null}
    </article>
  );
}
