import type { EditableUIDocument } from "./uiDocumentModel";

export type UIAppRoute = { path: string; pageId: string; title: string; componentReferences: string[] };
export type UIReusableComponent = { id: string; nodeId: string; sourcePageId: string; sourceNodeKind: string; title: string; semanticRole: string; semanticLabel: string; usagePageIds: string[]; usageNodeIds: string[]; createdAt: string; claimBoundary: string };
export type UISharedSection = { id: string; kind: "navigation"|"header"|"footer"|"section"; title: string; nodeIds: string[]; pageIds: string[] };
export type UIAppStructure = { pages: Array<{ id: string; title: string; route: string }>; routes: UIAppRoute[]; reusableComponents: UIReusableComponent[]; sharedSections: UISharedSection[]; navigation: Array<{ title: string; path: string; pageId: string }> };
export type UIAppStructureValidationResult = { valid: boolean; issues: string[] };

const normalizeToken = (v: string) => v.trim().toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "");
export const slug = (v: string) => "/" + normalizeToken(v);

export function normalizeUIRoutePath(input: string): string | null {
  const raw = String(input ?? "").trim();
  if (!raw) return null;
  const hadSlash = raw.includes("/");
  const pieces = raw.split("/").map((p) => normalizeToken(p)).filter(Boolean);
  if (pieces.length === 0) return null;
  if (!hadSlash) return `/${pieces.join("-")}`;
  return `/${pieces.join("/")}`;
}

export function createUIAppStructureFromDocument(document: EditableUIDocument): UIAppStructure {
  const pages = [...document.pages].map((p) => ({ id: p.id, title: p.title, route: normalizeUIRoutePath(p.route) ?? slug(p.title) })).sort((a, b) => a.id.localeCompare(b.id));
  const routes = pages.map((p) => ({ path: p.route, pageId: p.id, title: p.title, componentReferences: Object.values(document.pages.find(dp => dp.id === p.id)?.nodes ?? {}).map((n) => n.id).sort() }));
  const sharedSections: UISharedSection[] = [];
  const byComponentId = new Map<string, UIReusableComponent>();
  for (const page of document.pages) {
    for (const node of Object.values(page.nodes)) {
      const label = String(node.identity?.semanticLabel ?? "").toLowerCase();
      const role = String(node.identity?.semanticRole ?? "").toLowerCase();
      if (label.includes("nav") || role.includes("nav")) sharedSections.push({ id: `shared:nav:${page.id}`, kind: "navigation", title: page.title, nodeIds: [node.id], pageIds: [page.id] });
      if (label.includes("header") || role.includes("header")) sharedSections.push({ id: `shared:header:${page.id}`, kind: "header", title: page.title, nodeIds: [node.id], pageIds: [page.id] });
      if (label.includes("footer") || role.includes("footer")) sharedSections.push({ id: `shared:footer:${page.id}`, kind: "footer", title: page.title, nodeIds: [node.id], pageIds: [page.id] });
      const componentId = String((node.props as any)?.reusableComponentId ?? "").trim();
      if (!componentId) continue;
      const current = byComponentId.get(componentId) ?? { id: componentId, nodeId: node.id, sourcePageId: String(node.identity?.sourcePageId ?? page.id), sourceNodeKind: node.kind, title: String((node.props as any)?.reusableTitle ?? node.identity?.semanticLabel ?? componentId), semanticRole: String(node.identity?.semanticRole ?? "component"), semanticLabel: String(node.identity?.semanticLabel ?? "reusable component"), usagePageIds: [], usageNodeIds: [], createdAt: String(node.identity?.createdAt ?? document.metadata.generatedAt), claimBoundary: String(document.metadata.claimBoundary ?? "") };
      current.usagePageIds = [...new Set([...current.usagePageIds, page.id])].sort();
      current.usageNodeIds = [...new Set([...current.usageNodeIds, node.id])].sort();
      byComponentId.set(componentId, current);
    }
  }
  const reusableComponents = [...byComponentId.values()].sort((a, b) => a.id.localeCompare(b.id));
  const navigation = pages.map((p) => ({ title: p.title, path: p.route || slug(p.title), pageId: p.id }));
  return { pages, routes, reusableComponents, sharedSections: sharedSections.sort((a, b) => a.id.localeCompare(b.id)), navigation };
}

export function validateUIAppStructure(structure: UIAppStructure): UIAppStructureValidationResult {
  const issues: string[] = [];
  const pageIds = new Set<string>();
  const paths = new Set<string>();
  for (const p of structure.pages) { if (pageIds.has(p.id)) issues.push(`duplicate page id: ${p.id}`); pageIds.add(p.id); }
  for (const r of structure.routes) { if (paths.has(r.path)) issues.push(`duplicate route path: ${r.path}`); paths.add(r.path); if (!pageIds.has(r.pageId)) issues.push(`route references unknown page: ${r.pageId}`); }
  return { valid: issues.length === 0, issues };
}
