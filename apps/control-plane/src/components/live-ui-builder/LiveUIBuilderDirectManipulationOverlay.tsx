"use client";

import React from "react";
import type { UIDirectManipulationAction } from "../../../../../packages/ui-preview-engine/src/uiDirectManipulationModel";

export function LiveUIBuilderDirectManipulationOverlay({ selectedNodeId, pageId, onAction }: { selectedNodeId?: string; pageId: string; onAction: (action: UIDirectManipulationAction) => void }) {
  const nodeId = selectedNodeId;
  const disabled = !nodeId;

  return (
    <section className="vibe-rail-card" aria-label="Direct manipulation overlay" data-testid="live-ui-direct-manipulation-overlay">
      <h3>Direct Manipulation</h3>
      <p>Selected: {nodeId ?? "none"}</p>
      <div role="group" aria-label="Node controls">
        <button type="button" disabled={disabled} onClick={() => nodeId && onAction({ type: "duplicateNode", pageId, nodeId, idSeed: "live-ui" })}>Duplicate</button>
        <button type="button" disabled={disabled} onClick={() => nodeId && onAction({ type: "deleteNode", pageId, nodeId, confirm: false })}>Delete</button>
        <button type="button" disabled={disabled} onClick={() => nodeId && onAction({ type: "resizeNode", pageId, nodeId, width: "320px" })}>Width 320</button>
        <button type="button" disabled={disabled} onClick={() => nodeId && onAction({ type: "editProp", pageId, nodeId, propName: "className", value: "liveui-selected" })}>Set class</button>
      </div>
      <p>Keyboard: Tab to controls, Enter/Space to activate deterministic actions.</p>
    </section>
  );
}
