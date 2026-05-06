"use client";

import { LiveUIBuilderDocumentRenderer } from "@/components/live-ui-builder/LiveUIBuilderDocumentRenderer";
import { LiveUIBuilderInspectOverlay } from "@/components/live-ui-builder/LiveUIBuilderInspectOverlay";
import type { EditableUIDocument } from "../../../../../packages/ui-preview-engine/src/uiDocumentModel";

type Props = {
  editableDocument: EditableUIDocument;
  selectedNodeId?: string;
  changedNodeIds?: string[];
  previewPatch?: unknown;
  onSelectNode?: (nodeId: string) => void;
};

export function LiveUIBuilderPreviewSurface({ editableDocument, selectedNodeId, changedNodeIds = [], previewPatch, onSelectNode }: Props) {
  const patchReady = Boolean(previewPatch);
  return (
    <section className="live-ui-builder-preview-surface" data-preview-status="document-driven" aria-label="Live UI Builder preview surface">
      <header className="live-ui-builder-preview-header">
        <span>Live Preview Canvas</span>
        <small>{patchReady ? "Patch preview available" : "Awaiting edit command"}</small>
      </header>
      <LiveUIBuilderDocumentRenderer editableDocument={editableDocument} selectedNodeId={selectedNodeId} changedNodeIds={changedNodeIds} onSelectNode={onSelectNode} />
      <LiveUIBuilderInspectOverlay selectedNodeId={selectedNodeId} changedNodeIds={changedNodeIds} onSelectNode={onSelectNode ?? (() => undefined)} />
    </section>
  );
}

export default LiveUIBuilderPreviewSurface;
