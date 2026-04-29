import { cloneEditableUIDocument, type EditableUIDocument, type EditableUIPage } from "./uiDocumentModel";
import { createUIDocumentDiff } from "./uiDocumentDiff";
import { listUIPageTargetCandidates, resolveUIPageReference, type UIAppStructureCommand } from "./uiAppStructureCommands";
import { normalizeUIRoutePath } from "./uiAppStructureModel";

export type UIAppStructureMutationResult = { status: "applied"|"blocked"|"needsResolution"|"invalid"; document: EditableUIDocument; changedPageIds: string[]; changedNodeIds: string[]; diff?: ReturnType<typeof createUIDocumentDiff>; issues?: string[]; candidates?: Array<{ pageId: string; title: string; route: string; reason: string }> };
const slug = (v: string) => v.trim().toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "");

const hasRouteCollision = (doc: EditableUIDocument, normalizedRoute: string, exceptPageId?: string) => doc.pages.some((p) => p.id !== exceptPageId && normalizeUIRoutePath(p.route) === normalizedRoute);

export function applyUIAppStructureCommand(document: EditableUIDocument, command: UIAppStructureCommand, context?: { idSeed?: string; selectedNodeId?: string; now?: string }): UIAppStructureMutationResult {
  const next = cloneEditableUIDocument(document); const changedPageIds = new Set<string>(); const changedNodeIds = new Set<string>();
  if (command.type === "addPage") {
    const route = normalizeUIRoutePath(command.title); if (!route) return { status: "invalid", document, changedPageIds: [], changedNodeIds: [], issues: ["invalid route/title"] };
    if (hasRouteCollision(next, route)) return { status: "blocked", document, changedPageIds: [], changedNodeIds: [], issues: [`duplicate route path: ${route}`] };
    const id = `${slug(command.title)}-${context?.idSeed ?? "seed"}`;
    const page: EditableUIPage = { id, route, name: command.title, title: command.title, rootNodeIds: [], nodes: {} }; next.pages.push(page); changedPageIds.add(id);
  } else if (command.type === "removePage") {
    if (next.pages.length <= 1) return { status: "blocked", document, changedPageIds: [], changedNodeIds: [], issues: ["cannot remove last page"] };
    const resolved = resolveUIPageReference(next, command.pageRef); if (resolved.status !== "resolved") return { status: "needsResolution", document, changedPageIds: [], changedNodeIds: [], issues: [resolved.reason], candidates: resolved.candidates };
    next.pages = next.pages.filter((p) => p.id !== resolved.page.id); changedPageIds.add(resolved.page.id);
  } else if (command.type === "renamePage") {
    const resolved = resolveUIPageReference(next, command.from); if (resolved.status !== "resolved") return { status: "needsResolution", document, changedPageIds: [], changedNodeIds: [], issues: [resolved.reason], candidates: resolved.candidates };
    const p = resolved.page;
    const route = normalizeUIRoutePath(command.to); if (!route) return { status: "invalid", document, changedPageIds: [], changedNodeIds: [], issues: ["invalid route/title"] };
    if (hasRouteCollision(next, route, p.id)) return { status: "blocked", document, changedPageIds: [], changedNodeIds: [], issues: [`duplicate route path: ${route}`] };
    p.title = command.to; p.name = command.to; p.route = route; changedPageIds.add(p.id);
  } else if (command.type === "duplicatePage") {
    const resolved = resolveUIPageReference(next, command.pageRef); if (resolved.status !== "resolved") return { status: "needsResolution", document, changedPageIds: [], changedNodeIds: [], issues: [resolved.reason], candidates: resolved.candidates };
    const p = resolved.page;
    const suffix = context?.idSeed ?? "copy"; const cloned = cloneEditableUIDocument({ ...next, pages: [p] }).pages[0];
    const idMap = new Map<string, string>();
    for (const oldId of Object.keys(cloned.nodes)) idMap.set(oldId, `${oldId}::${suffix}`);
    const nodes: any = {};
    for (const [oldId, node] of Object.entries(cloned.nodes)) { const nid = idMap.get(oldId)!; nodes[nid] = { ...node, id: nid, parentId: node.parentId ? idMap.get(node.parentId as string) : undefined, childIds: (node.childIds as string[]).map((c) => idMap.get(c)!), identity: { ...(node as any).identity, nodeId: nid } }; changedNodeIds.add(nid); }
    let newRoute = normalizeUIRoutePath(`${p.route}-${suffix}`) ?? `/${slug(`${p.route}-${suffix}`)}`;
    if (hasRouteCollision(next, newRoute)) newRoute = `${newRoute}-${suffix}`;
    next.pages.push({ ...cloned, id: `${p.id}-${suffix}`, title: `${p.title} Copy`, name: `${p.name} Copy`, route: newRoute, rootNodeIds: cloned.rootNodeIds.map((r) => idMap.get(r)!), nodes }); changedPageIds.add(`${p.id}-${suffix}`);
  } else if (command.type === "updateNavigation") {
    const resolved = resolveUIPageReference(next, command.entryRef); if (resolved.status !== "resolved") return { status: "needsResolution", document, changedPageIds: [], changedNodeIds: [], issues: [resolved.reason], candidates: resolved.candidates.length ? resolved.candidates : listUIPageTargetCandidates(next, command.entryRef) };
    const p = resolved.page;
    p.route = normalizeUIRoutePath(p.route) ?? normalizeUIRoutePath(p.title) ?? p.route;
    next.metadata = { ...next.metadata, claimBoundary: `${next.metadata.claimBoundary} Source sync remains explicit and guarded.` }; changedPageIds.add(p.id);
  } else if (command.type === "extractComponent") {
    const selected = context?.selectedNodeId ?? command.nodeRef; if (!selected) return { status: "needsResolution", document, changedPageIds: [], changedNodeIds: [], issues: ["node selection required"] };
    for (const page of next.pages) if (page.nodes[selected]) { const node = page.nodes[selected] as any; const reusableId = `reusable:${slug(command.title ?? selected)}`; node.props = { ...node.props, reusableComponentId: reusableId, reusableTitle: command.title ?? node.identity?.semanticLabel, sourceNodeId: node.id, sourcePageId: page.id, sourceNodeKind: node.kind, semanticRole: node.identity?.semanticRole, semanticLabel: node.identity?.semanticLabel, usagePageIds: [page.id], usageNodeIds: [node.id], createdAt: context?.now ?? document.metadata.generatedAt, claimBoundary: document.metadata.claimBoundary }; changedPageIds.add(page.id); changedNodeIds.add(selected); }
  } else if (command.type === "reuseComponent") {
    const resolved = resolveUIPageReference(next, command.pageRef); if (resolved.status !== "resolved") return { status: "needsResolution", document, changedPageIds: [], changedNodeIds: [], issues: [resolved.reason], candidates: resolved.candidates };
    const p = resolved.page;
    const nid = `reuse:${slug(command.componentRef)}:${context?.idSeed ?? "seed"}`; p.nodes[nid] = { id: nid, kind: "component", identity: { nodeId: nid, semanticRole: "component", semanticLabel: `Reusable ${command.componentRef}`, sourcePageId: p.id, createdBy: "ui-app-structure-mutation", createdAt: context?.now ?? new Date(0).toISOString(), updatedAt: context?.now ?? new Date(0).toISOString(), identityVersion: "1.0.0" }, childIds: [], props: { reusableComponentId: command.componentRef, reusedComponentId: command.componentRef, sourceNodeId: command.componentRef, sourcePageId: p.id, usagePageIds: [p.id], usageNodeIds: [nid] }, style: {}, layout: {}, bindings: [], actionBindings: [], formBindings: [], provenance: { blueprintId: document.sourceBlueprintId, sourceType: "blueprint" }, safety: { editable: true, guardrails: ["no-placeholder"] } } as any; p.rootNodeIds = [...p.rootNodeIds, nid]; changedPageIds.add(p.id); changedNodeIds.add(nid);
  } else return { status: "invalid", document, changedPageIds: [], changedNodeIds: [], issues: ["unsupported command"] };

  const diff = createUIDocumentDiff(document, next);
  return { status: "applied", document: next, changedPageIds: [...changedPageIds], changedNodeIds: [...changedNodeIds], diff };
}
