"use client";

import { useMemo } from "react";

export function LiveUIBuilderInspectOverlay({ selectedNodeId, changedNodeIds, onSelectNode }: { selectedNodeId?: string; changedNodeIds?: string[]; onSelectNode: (nodeId: string) => void }) {
  const changed = useMemo(() => new Set(changedNodeIds ?? []), [changedNodeIds]);

  const onClickCapture: React.MouseEventHandler<HTMLElement> = (event) => {
    const target = event.target as HTMLElement;
    const candidate = target.closest("[data-live-ui-node-id]") as HTMLElement | null;
    const nodeId = candidate?.getAttribute("data-live-ui-node-id");
    if (!nodeId) return;
    event.preventDefault();
    onSelectNode(nodeId);
  };

  return (
    <div data-testid="live-ui-builder-inspect-overlay" onClickCapture={onClickCapture}>
      <p>Inspect/select overlay enabled.</p>
      <div data-selected={selectedNodeId ? "true" : "false"} data-selectable="true">Selected: {selectedNodeId ?? "none"}</div>
      {[...changed].sort().map((id) => <div key={id} data-live-ui-node-id={id} data-changed="true" data-selectable="true">Changed: {id}</div>)}
    </div>
  );
}
