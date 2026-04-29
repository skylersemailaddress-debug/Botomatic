import path from "path";
import { type UISourcePatch, validateUISourcePatch } from "./uiSourcePatch";

export type UISourceApplyMode = "dryRun" | "confirmedApply";
export type FileSystemAdapter = { readFile(path: string): string; writeFile(path: string, content: string): void; exists(path: string): boolean; listFiles?(glob: string): string[] };
export type UISourceApplyResult = { ok: boolean; mode: UISourceApplyMode; changedFiles: string[]; writesPerformed: number; blockedReasons: string[] };

export function applyUISourcePatch(patch: UISourcePatch, fileSystemAdapter: FileSystemAdapter, options: { mode: UISourceApplyMode; projectRoot: string; confirmationMarker?: boolean }): UISourceApplyResult {
  const changedFiles = [...new Set(patch.operations.map((o) => o.targetFilePath))].sort((a, b) => a.localeCompare(b));
  const blockedReasons: string[] = [];
  const validation = validateUISourcePatch(patch);
  if (!validation.valid) blockedReasons.push(...validation.issues);
  const hasManual = patch.operations.some((o) => o.kind === "manualReviewRequired");
  if (hasManual) blockedReasons.push("manualReviewRequired operations present");
  for (const p of changedFiles) {
    const resolved = path.resolve(options.projectRoot, p);
    if (!resolved.startsWith(path.resolve(options.projectRoot))) blockedReasons.push(`path escapes project root: ${p}`);
    if (p.startsWith("release-evidence/runtime/") || p.includes("/release-evidence/runtime/")) blockedReasons.push(`blocked protected runtime evidence path: ${p}`);
  }
  if (options.mode === "dryRun") return { ok: blockedReasons.length === 0, mode: options.mode, changedFiles, writesPerformed: 0, blockedReasons };
  if (options.confirmationMarker !== true) blockedReasons.push("confirmedApply requires confirmationMarker === true");
  if (blockedReasons.length > 0) return { ok: false, mode: options.mode, changedFiles, writesPerformed: 0, blockedReasons };

  let writesPerformed = 0;
  for (const op of patch.operations) {
    if (op.kind === "replaceText" || op.kind === "insertText") {
      const existing = fileSystemAdapter.exists(op.targetFilePath) ? fileSystemAdapter.readFile(op.targetFilePath) : "";
      fileSystemAdapter.writeFile(op.targetFilePath, op.afterSnippet ?? existing);
      writesPerformed += 1;
    } else if (op.kind === "removeText") {
      const existing = fileSystemAdapter.exists(op.targetFilePath) ? fileSystemAdapter.readFile(op.targetFilePath) : "";
      fileSystemAdapter.writeFile(op.targetFilePath, "");
      if (existing !== "") writesPerformed += 1;
    } else if (op.kind === "createFile") {
      fileSystemAdapter.writeFile(op.targetFilePath, op.afterSnippet ?? "");
      writesPerformed += 1;
    } else if (op.kind === "deleteFile") {
      fileSystemAdapter.writeFile(op.targetFilePath, "");
      writesPerformed += 1;
    }
  }
  return { ok: true, mode: options.mode, changedFiles, writesPerformed, blockedReasons };
}
