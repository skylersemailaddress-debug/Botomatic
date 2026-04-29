import React from "react";
import type { EditableUIDocument, EditableUINode } from "../../../../../packages/ui-preview-engine/src/uiDocumentModel";

const KNOWN_KINDS = new Set(["page", "root", "container", "section", "card", "button", "text", "image", "form", "nav", "footer", "header", "input", "list", "grid", "pageRoot", "component"]);

export type LiveUIBuilderNodeSelectionTarget = { closest: (selector: string) => { getAttribute: (name: string) => string | null } | null };
export function resolveLiveUINodeIdFromTarget(target: LiveUIBuilderNodeSelectionTarget): string | undefined {
  const candidate = target.closest("[data-live-ui-node-id]");
  return candidate?.getAttribute("data-live-ui-node-id") ?? undefined;
}

function getNodeText(node: EditableUINode): string {
  const props = (node.props ?? {}) as Record<string, unknown>;
  const candidates = [props.text, props.content, props.title, props.label, node.identity?.semanticLabel];
  for (const value of candidates) if (typeof value === "string" && value.trim()) return value;
  return node.identity?.semanticRole || node.kind;
}

function getTag(kind: string): string {
  const map: Record<string, string> = { page: "section", pageRoot: "section", root: "div", component: "div", container: "div", section: "section", card: "article", button: "button", text: "p", image: "figure", form: "form", nav: "nav", footer: "footer", header: "header", input: "label", list: "ul", grid: "div" };
  return map[kind] ?? "div";
}

function NodeView({ node, nodes, selectedNodeId, changedNodeIds }: { node: EditableUINode; nodes: Record<string, EditableUINode>; selectedNodeId?: string; changedNodeIds: Set<string> }) {
  const kind = node.kind as string;
  const Tag = getTag(kind) as any;
  const text = getNodeText(node);
  return <Tag data-live-ui-node-id={node.id} data-live-ui-node-kind={kind} data-selectable="true" data-selected={selectedNodeId===node.id?"true":undefined} data-changed={changedNodeIds.has(node.id)?"true":undefined}><small>{kind} · {node.identity.semanticLabel} · {node.identity.semanticRole}</small>{kind === "input" ? <input aria-label={text} placeholder={text} /> : kind === "image" ? <img alt={text} src="data:image/gif;base64,R0lGODlhAQABAAAAACw=" /> : kind === "list" ? <li>{text}</li> : <span>{text}</span>}{!KNOWN_KINDS.has(kind) ? <em>Unknown node kind rendered safely.</em> : null}{node.childIds.map((id) => nodes[id] ? <NodeView key={id} node={nodes[id]} nodes={nodes} selectedNodeId={selectedNodeId} changedNodeIds={changedNodeIds} /> : null)}</Tag>;
}

export function LiveUIBuilderDocumentRenderer({ editableDocument, selectedNodeId, changedNodeIds, onSelectNode }: { editableDocument: EditableUIDocument; selectedNodeId?: string; changedNodeIds?: string[]; onSelectNode?: (nodeId: string) => void }) {
  const changedSet = new Set(changedNodeIds ?? []);
  const onClickCapture: React.MouseEventHandler<HTMLElement> = (event) => {
    if (!onSelectNode) return;
    const nodeId = resolveLiveUINodeIdFromTarget(event.target as unknown as LiveUIBuilderNodeSelectionTarget);
    if (nodeId) onSelectNode(nodeId);
  };
  return <section data-testid="live-ui-builder-document-renderer" onClickCapture={onClickCapture}><p>Document-driven preview, not final production rendering.</p>{editableDocument.pages.map((page) => <section key={page.id} data-live-ui-page-id={page.id}><h3>{page.title}</h3>{page.rootNodeIds.map((id) => page.nodes[id] ? <NodeView key={id} node={page.nodes[id]} nodes={page.nodes} selectedNodeId={selectedNodeId} changedNodeIds={changedSet} /> : null)}</section>)}</section>;
}
