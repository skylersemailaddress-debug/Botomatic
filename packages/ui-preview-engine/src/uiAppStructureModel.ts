import type { EditableUIDocument } from "./uiDocumentModel";

export type UIAppRoute = { path: string; pageId: string; title: string; componentReferences: string[] };
export type UIReusableComponent = { id: string; nodeId: string; pageIds: string[]; title: string };
export type UISharedSection = { id: string; kind: "navigation"|"header"|"footer"|"section"; title: string; nodeIds: string[]; pageIds: string[] };
export type UIAppStructure = { pages: Array<{ id: string; title: string; route: string }>; routes: UIAppRoute[]; reusableComponents: UIReusableComponent[]; sharedSections: UISharedSection[]; navigation: Array<{ title: string; path: string; pageId: string }> };
export type UIAppStructureValidationResult = { valid: boolean; issues: string[] };

const slug = (v: string) => "/" + v.trim().toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "");

export function createUIAppStructureFromDocument(document: EditableUIDocument): UIAppStructure {
  const pages = [...document.pages].map((p) => ({ id: p.id, title: p.title, route: p.route })).sort((a, b) => a.id.localeCompare(b.id));
  const routes = pages.map((p) => ({ path: p.route, pageId: p.id, title: p.title, componentReferences: Object.values(document.pages.find(dp => dp.id === p.id)?.nodes ?? {}).map((n) => n.id).sort() }));
  const sharedSections: UISharedSection[] = [];
  const reusableComponents: UIReusableComponent[] = [];
  const byLabel = new Map<string, { nodeIds: string[]; pageIds: Set<string> }>();
  for (const page of document.pages) {
    for (const node of Object.values(page.nodes)) {
      const label = String(node.identity?.semanticLabel ?? "").toLowerCase();
      const role = String(node.identity?.semanticRole ?? "").toLowerCase();
      if (label.includes("nav") || role.includes("nav")) sharedSections.push({ id: `shared:nav:${page.id}`, kind: "navigation", title: page.title, nodeIds: [node.id], pageIds: [page.id] });
      if (label.includes("header") || role.includes("header")) sharedSections.push({ id: `shared:header:${page.id}`, kind: "header", title: page.title, nodeIds: [node.id], pageIds: [page.id] });
      if (label.includes("footer") || role.includes("footer")) sharedSections.push({ id: `shared:footer:${page.id}`, kind: "footer", title: page.title, nodeIds: [node.id], pageIds: [page.id] });
      const key = `${role}|${label}`;
      const current = byLabel.get(key) ?? { nodeIds: [], pageIds: new Set<string>() };
      current.nodeIds.push(node.id); current.pageIds.add(page.id); byLabel.set(key, current);
    }
  }
  for (const [key, value] of [...byLabel.entries()].sort((a, b) => a[0].localeCompare(b[0]))) {
    if (value.pageIds.size > 1) reusableComponents.push({ id: `reusable:${key.replace(/[^a-z0-9|]+/g, "-")}`, nodeId: value.nodeIds.sort()[0], pageIds: [...value.pageIds].sort(), title: key.split("|")[1] || "reusable" });
  }
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
