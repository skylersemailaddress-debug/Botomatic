import type { EditableUIDocument, EditableUIPage } from "./uiDocumentModel";
import { normalizeUIRoutePath } from "./uiAppStructureModel";

export type UIAppStructureCommand =
| { type: "addPage"; title: string }
| { type: "removePage"; pageRef: string }
| { type: "renamePage"; from: string; to: string }
| { type: "duplicatePage"; pageRef: string }
| { type: "addRoute"; pageRef: string; path: string }
| { type: "updateRoute"; pageRef: string; path: string }
| { type: "addReusableComponent"; title: string }
| { type: "updateReusableComponent"; componentId: string; title: string }
| { type: "extractComponent"; nodeRef: string; title?: string }
| { type: "reuseComponent"; componentRef: string; pageRef: string }
| { type: "addSharedSection"; sectionRef: string }
| { type: "updateSharedSection"; sectionRef: string }
| { type: "updateNavigation"; entryRef: string };

export type ParsedUIAppStructureCommand = { status: "ok"; command: UIAppStructureCommand } | { status: "needsResolution"; reason: string };

const slugish = (v: string) => String(v ?? "").trim().toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "");

export function listUIPageTargetCandidates(document: EditableUIDocument, pageRef: string): Array<{ pageId: string; title: string; route: string; reason: string }> {
  const ref = String(pageRef ?? "").trim();
  const lower = ref.toLowerCase();
  const normalizedRoute = normalizeUIRoutePath(ref);
  const normalizedTitle = slugish(ref);
  const out: Array<{ pageId: string; title: string; route: string; reason: string }> = [];
  for (const page of document.pages) {
    const pageRoute = normalizeUIRoutePath(page.route) ?? "";
    if (page.id === ref) out.push({ pageId: page.id, title: page.title, route: pageRoute, reason: "id" });
    if (page.title === ref) out.push({ pageId: page.id, title: page.title, route: pageRoute, reason: "title" });
    if (page.title.toLowerCase() === lower || slugish(page.title) === normalizedTitle || slugish(page.name) === normalizedTitle) out.push({ pageId: page.id, title: page.title, route: pageRoute, reason: "slug" });
    if (normalizedRoute && pageRoute === normalizedRoute) out.push({ pageId: page.id, title: page.title, route: pageRoute, reason: "route" });
  }
  return out;
}

export function resolveUIPageReference(document: EditableUIDocument, pageRef: string): { status: "resolved"; page: EditableUIPage } | { status: "needsResolution"; reason: string; candidates: Array<{ pageId: string; title: string; route: string; reason: string }> } {
  const candidates = listUIPageTargetCandidates(document, pageRef);
  const unique = [...new Map(candidates.map((c) => [c.pageId, c])).values()];
  if (unique.length === 1) {
    const page = document.pages.find((p) => p.id === unique[0].pageId)!;
    return { status: "resolved", page };
  }
  return { status: "needsResolution", reason: unique.length ? "Ambiguous page reference" : "Page reference not found", candidates: unique };
}

export function parseUIAppStructureCommand(text: string): ParsedUIAppStructureCommand { const t = text.trim().toLowerCase(); let m;
  if ((m = t.match(/^add (?:a )?(.+?) page$/))) return { status: "ok", command: { type: "addPage", title: m[1] } };
  if ((m = t.match(/^rename (.+?) to (.+)$/))) return { status: "ok", command: { type: "renamePage", from: m[1], to: m[2] } };
  if ((m = t.match(/^duplicate (?:the )?(.+?) page$/))) return { status: "ok", command: { type: "duplicatePage", pageRef: m[1] } };
  if ((m = t.match(/^remove (.+)$/))) return { status: "ok", command: { type: "removePage", pageRef: m[1] } };
  if (t.includes("add this section to every page")) return { status: "ok", command: { type: "addSharedSection", sectionRef: "selected" } };
  if ((m = t.match(/^make this (.+?) reusable$/))) return { status: "ok", command: { type: "extractComponent", nodeRef: "selected", title: m[1] } };
  if ((m = t.match(/^reuse this (.+?) on the (.+?) page$/))) return { status: "ok", command: { type: "reuseComponent", componentRef: m[1], pageRef: m[2] } };
  if ((m = t.match(/^add (.+?) to the nav(igation)?$/))) return { status: "ok", command: { type: "updateNavigation", entryRef: m[1] } };
  return { status: "needsResolution", reason: "Unknown or ambiguous app-structure command." };
}

export function validateUIAppStructureCommand(command: UIAppStructureCommand): { valid: boolean; issues: string[] } { const issues: string[] = [];
  if ((command.type === "addPage") && !command.title.trim()) issues.push("addPage.title required");
  if (command.type === "renamePage" && (!command.from.trim() || !command.to.trim())) issues.push("renamePage from/to required");
  if (command.type === "duplicatePage" && !command.pageRef.trim()) issues.push("duplicatePage pageRef required");
  if (JSON.stringify(command).toLowerCase().includes("source write")) issues.push("no source-write claims allowed");
  return { valid: issues.length === 0, issues };
}
