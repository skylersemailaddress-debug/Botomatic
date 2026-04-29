import { type EditableUIDocument } from "./uiDocumentModel";

export type UISourceFileMappingTarget = {
  type: "page" | "component" | "theme" | "style" | "manualReviewRequired";
  sourceId: string;
  filePath?: string;
  manualReviewRequired?: boolean;
  reason?: string;
};

export type UISourceFileMapping = {
  targets: UISourceFileMappingTarget[];
  manualReviewRequired: UISourceFileMappingTarget[];
  caveat: string;
};

export type UISourceFileMappingResult = { mapping: UISourceFileMapping; valid: boolean; issues: string[] };

export const UI_SOURCE_FILE_MAPPING_CAVEAT = "Mapping is deterministic planning metadata only and does not write files or prove full source-sync completion.";

export function createUISourceFileMapping(document: EditableUIDocument, options?: { pageFileMap?: Record<string, string>; componentFileMap?: Record<string, string>; themeFilePath?: string; styleFilePath?: string; }): UISourceFileMapping {
  const targets: UISourceFileMappingTarget[] = [];
  for (const page of [...document.pages].sort((a, b) => a.id.localeCompare(b.id))) {
    const pagePath = options?.pageFileMap?.[page.id] ?? `app${page.route}/page.tsx`;
    targets.push({ type: "page", sourceId: page.id, filePath: pagePath });

    const nodeIds = Object.keys(page.nodes).sort((a, b) => a.localeCompare(b));
    for (const nodeId of nodeIds) {
      const node = page.nodes[nodeId];
      const componentId = node.identity?.sourceBlueprintComponentId;
      const resolved = componentId ? options?.componentFileMap?.[componentId] : undefined;
      if (resolved) targets.push({ type: "component", sourceId: node.id, filePath: resolved });
      else if (componentId) targets.push({ type: "manualReviewRequired", sourceId: node.id, manualReviewRequired: true, reason: `Missing component mapping for ${componentId}` });
    }
  }

  targets.push({ type: "theme", sourceId: `${document.id}:theme`, filePath: options?.themeFilePath ?? "src/theme.ts" });
  if (options?.styleFilePath) targets.push({ type: "style", sourceId: `${document.id}:style`, filePath: options.styleFilePath });
  const manualReviewRequired = targets.filter((t) => t.manualReviewRequired || t.type === "manualReviewRequired");
  return { targets, manualReviewRequired, caveat: UI_SOURCE_FILE_MAPPING_CAVEAT };
}

export function validateUISourceFileMapping(mapping: UISourceFileMapping): UISourceFileMappingResult {
  const issues: string[] = [];
  if (!Array.isArray(mapping?.targets)) issues.push("targets missing");
  if (!mapping?.caveat?.includes("does not write files")) issues.push("caveat missing");
  for (const target of mapping?.targets ?? []) {
    if (!["page", "component", "theme", "style", "manualReviewRequired"].includes(target.type)) issues.push(`invalid target type: ${target.type}`);
    if (!target.sourceId) issues.push("target.sourceId missing");
    if (target.type !== "manualReviewRequired" && !target.filePath) issues.push(`target.filePath missing for ${target.sourceId}`);
  }
  return { mapping, valid: issues.length === 0, issues };
}
