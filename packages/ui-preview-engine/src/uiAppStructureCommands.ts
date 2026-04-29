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

export function parseUIAppStructureCommand(text: string): ParsedUIAppStructureCommand {
  const t = text.trim().toLowerCase();
  let m;
  if ((m = t.match(/^add (?:a )?(.+?) page$/))) return { status: "ok", command: { type: "addPage", title: m[1] } };
  if ((m = t.match(/^rename (.+?) to (.+)$/))) return { status: "ok", command: { type: "renamePage", from: m[1], to: m[2] } };
  if ((m = t.match(/^duplicate (?:the )?(.+?) page$/))) return { status: "ok", command: { type: "duplicatePage", pageRef: m[1] } };
  if (t.includes("add this section to every page")) return { status: "ok", command: { type: "addSharedSection", sectionRef: "selected" } };
  if ((m = t.match(/^make this (.+?) reusable$/))) return { status: "ok", command: { type: "extractComponent", nodeRef: "selected", title: m[1] } };
  if ((m = t.match(/^reuse this (.+?) on the (.+?) page$/))) return { status: "ok", command: { type: "reuseComponent", componentRef: m[1], pageRef: m[2] } };
  if ((m = t.match(/^add (.+?) to the nav(igation)?$/))) return { status: "ok", command: { type: "updateNavigation", entryRef: m[1] } };
  return { status: "needsResolution", reason: "Unknown or ambiguous app-structure command." };
}

export function validateUIAppStructureCommand(command: UIAppStructureCommand): { valid: boolean; issues: string[] } {
  const issues: string[] = [];
  if ((command.type === "addPage") && !command.title.trim()) issues.push("addPage.title required");
  if (command.type === "renamePage" && (!command.from.trim() || !command.to.trim())) issues.push("renamePage from/to required");
  if (command.type === "duplicatePage" && !command.pageRef.trim()) issues.push("duplicatePage pageRef required");
  if (JSON.stringify(command).toLowerCase().includes("source write")) issues.push("no source-write claims allowed");
  return { valid: issues.length === 0, issues };
}
