import { cloneEditableUIDocument, type EditableUIDocument, type EditableUIPage } from "./uiDocumentModel";
import { createUIDocumentDiff } from "./uiDocumentDiff";
import type { UIAppStructureCommand } from "./uiAppStructureCommands";

export type UIAppStructureMutationResult = { status: "applied"|"blocked"|"needsResolution"|"invalid"; document: EditableUIDocument; changedPageIds: string[]; changedNodeIds: string[]; diff?: ReturnType<typeof createUIDocumentDiff>; issues?: string[] };
const slug = (v: string) => v.trim().toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "");

export function applyUIAppStructureCommand(document: EditableUIDocument, command: UIAppStructureCommand, context?: { idSeed?: string; selectedNodeId?: string }): UIAppStructureMutationResult {
  const next = cloneEditableUIDocument(document); const changedPageIds = new Set<string>(); const changedNodeIds = new Set<string>();
  const findPage = (ref: string) => next.pages.find((p) => p.id === ref || p.title.toLowerCase() === ref.toLowerCase() || p.name.toLowerCase() === ref.toLowerCase());
  if (command.type === "addPage") {
    const id = `${slug(command.title)}-${context?.idSeed ?? "seed"}`; const route = `/${slug(command.title)}`;
    const page: EditableUIPage = { id, route, name: command.title, title: command.title, rootNodeIds: [], nodes: {} }; next.pages.push(page); changedPageIds.add(id);
  } else if (command.type === "removePage") {
    if (next.pages.length <= 1) return { status: "blocked", document, changedPageIds: [], changedNodeIds: [], issues: ["cannot remove last page"] };
    const page = findPage(command.pageRef); if (!page) return { status: "needsResolution", document, changedPageIds: [], changedNodeIds: [], issues: ["page not found"] };
    next.pages = next.pages.filter((p) => p.id !== page.id); changedPageIds.add(page.id);
  } else if (command.type === "renamePage") {
    const p = findPage(command.from); if (!p) return { status: "needsResolution", document, changedPageIds: [], changedNodeIds: [], issues: ["page not found"] };
    p.title = command.to; p.name = command.to; p.route = `/${slug(command.to)}`; changedPageIds.add(p.id);
  } else if (command.type === "duplicatePage") {
    const p = findPage(command.pageRef); if (!p) return { status: "needsResolution", document, changedPageIds: [], changedNodeIds: [], issues: ["page not found"] };
    const suffix = context?.idSeed ?? "copy"; const cloned = cloneEditableUIDocument({ ...next, pages: [p] }).pages[0];
    const idMap = new Map<string, string>();
    for (const oldId of Object.keys(cloned.nodes)) idMap.set(oldId, `${oldId}::${suffix}`);
    const nodes: any = {};
    for (const [oldId, node] of Object.entries(cloned.nodes)) { const nid = idMap.get(oldId)!; nodes[nid] = { ...node, id: nid, parentId: node.parentId ? idMap.get(node.parentId as string) : undefined, childIds: (node.childIds as string[]).map((c) => idMap.get(c)!), identity: { ...(node as any).identity, nodeId: nid } }; changedNodeIds.add(nid); }
    next.pages.push({ ...cloned, id: `${p.id}-${suffix}`, title: `${p.title} Copy`, name: `${p.name} Copy`, route: `${p.route}-${suffix}`, rootNodeIds: cloned.rootNodeIds.map((r) => idMap.get(r)!), nodes }); changedPageIds.add(`${p.id}-${suffix}`);
  } else if (command.type === "updateNavigation") {
    const p = findPage(command.entryRef); if (!p) return { status: "needsResolution", document, changedPageIds: [], changedNodeIds: [], issues: ["navigation page not found"] };
    next.metadata = { ...next.metadata, claimBoundary: `${next.metadata.claimBoundary} Source sync remains guarded and planning-first.` }; changedPageIds.add(p.id);
  } else if (command.type === "extractComponent") {
    const selected = context?.selectedNodeId ?? command.nodeRef; if (!selected) return { status: "needsResolution", document, changedPageIds: [], changedNodeIds: [], issues: ["node selection required"] };
    for (const page of next.pages) if (page.nodes[selected]) { page.nodes[selected].props = { ...page.nodes[selected].props, reusableComponentId: `reusable:${slug(command.title ?? selected)}` }; changedPageIds.add(page.id); changedNodeIds.add(selected); }
  } else if (command.type === "reuseComponent") {
    const p = findPage(command.pageRef); if (!p) return { status: "needsResolution", document, changedPageIds: [], changedNodeIds: [], issues: ["target page not found"] };
    const nid = `reuse:${slug(command.componentRef)}:${context?.idSeed ?? "seed"}`; p.nodes[nid] = { id: nid, kind: "component", identity: { nodeId: nid, semanticRole: "component", semanticLabel: `Reusable ${command.componentRef}`, sourcePageId: p.id, createdBy: "ui-app-structure-mutation", createdAt: new Date(0).toISOString(), updatedAt: new Date(0).toISOString(), identityVersion: "1.0.0" }, childIds: [], props: { reusableComponentId: command.componentRef }, style: {}, layout: {}, bindings: [], actionBindings: [], formBindings: [], provenance: { blueprintId: document.sourceBlueprintId, sourceType: "blueprint" }, safety: { editable: true, guardrails: ["no-placeholder"] } } as any; p.rootNodeIds = [...p.rootNodeIds, nid]; changedPageIds.add(p.id); changedNodeIds.add(nid);
  } else return { status: "invalid", document, changedPageIds: [], changedNodeIds: [], issues: ["unsupported command"] };

  const diff = createUIDocumentDiff(document, next);
  return { status: "applied", document: next, changedPageIds: [...changedPageIds], changedNodeIds: [...changedNodeIds], diff };
}
