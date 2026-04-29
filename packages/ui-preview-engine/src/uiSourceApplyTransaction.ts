import crypto from "crypto";
import fs from "fs";
import path from "path";
import { applyUISourcePatch, type FileSystemAdapter, type UISourceApplyResult } from "./uiSourceApply";
import type { UISourcePatch } from "./uiSourcePatch";

export type UISourceApplySnapshot = { filePath: string; existedBefore: boolean; beforeContent?: string };
export type UISourceApplyTransaction = { id: string; patch: UISourcePatch; adapterKind: string; projectRoot: string; beforeSnapshot: UISourceApplySnapshot[]; mode: "dryRun"|"confirmedApply"; confirmed: boolean };
export type UISourceApplyRollbackResult = { ok: boolean; rollbackRestoredFiles: string[]; rollbackDeletedFiles: string[]; blockedReasons: string[] };

const blockPath = (projectRoot: string, filePath: string): string | undefined => {
  const root = path.resolve(projectRoot);
  const resolved = path.resolve(root, filePath);
  const rel = path.relative(root, resolved).replace(/\\/g, "/");
  if (!rel || rel.startsWith("..") || path.isAbsolute(rel)) return `path escapes project root: ${filePath}`;
  if (rel.startsWith("release-evidence/runtime/") || rel.includes("/release-evidence/runtime/")) return `blocked protected runtime evidence path: ${filePath}`;
  return undefined;
};

export function createUISourceApplyTransaction(patch: UISourcePatch, adapter: FileSystemAdapter, options: { projectRoot: string; mode?: "dryRun"|"confirmedApply"; confirmationMarker?: boolean; idSeed?: string; context?: string }): UISourceApplyTransaction {
  const beforeSnapshot = [...new Set(patch.operations.map((o) => o.targetFilePath))].sort((a,b)=>a.localeCompare(b)).map((filePath) => {
    const existedBefore = adapter.exists(filePath);
    return { filePath, existedBefore, beforeContent: existedBefore ? adapter.readFile(filePath) : undefined };
  });
  const rawId = `${options.context ?? "ui-source-apply"}:${options.idSeed ?? "default"}:${options.projectRoot}:${beforeSnapshot.map((s) => `${s.filePath}:${s.existedBefore ? "1" : "0"}`).join("|")}`;
  return {
    id: crypto.createHash("sha256").update(rawId).digest("hex").slice(0, 16),
    patch,
    adapterKind: adapter.kind ?? "unknown",
    projectRoot: options.projectRoot,
    beforeSnapshot,
    mode: options.mode ?? "dryRun",
    confirmed: options.confirmationMarker === true
  };
}

export function applyUISourceTransaction(transaction: UISourceApplyTransaction, options: { adapter: FileSystemAdapter; confirmationMarker?: boolean }): UISourceApplyResult {
  if (transaction.mode === "confirmedApply" && options.adapter.allowWrites !== true) {
    return applyUISourcePatch(transaction.patch, options.adapter, { mode: transaction.mode, projectRoot: transaction.projectRoot, confirmationMarker: options.confirmationMarker });
  }
  return applyUISourcePatch(transaction.patch, options.adapter, { mode: transaction.mode, projectRoot: transaction.projectRoot, confirmationMarker: options.confirmationMarker });
}

export function rollbackUISourceTransaction(transaction: UISourceApplyTransaction, adapter: FileSystemAdapter): UISourceApplyRollbackResult {
  const blockedReasons: string[] = [];
  const rollbackRestoredFiles: string[] = [];
  const rollbackDeletedFiles: string[] = [];
  for (const snap of transaction.beforeSnapshot) {
    const blocked = blockPath(transaction.projectRoot, snap.filePath);
    if (blocked) blockedReasons.push(blocked);
  }
  if (blockedReasons.length > 0) return { ok: false, rollbackRestoredFiles, rollbackDeletedFiles, blockedReasons: [...new Set(blockedReasons)].sort() };
  for (const snap of transaction.beforeSnapshot) {
    if (snap.existedBefore) {
      adapter.writeFile(snap.filePath, snap.beforeContent ?? "");
      rollbackRestoredFiles.push(snap.filePath);
    } else {
      if (adapter.exists(snap.filePath)) {
        if ((adapter as any).projectRoot) {
          const abs = path.resolve((adapter as any).projectRoot, snap.filePath);
          if (fs.existsSync(abs)) fs.unlinkSync(abs);
        } else {
          adapter.writeFile(snap.filePath, "");
        }
        rollbackDeletedFiles.push(snap.filePath);
      }
    }
  }
  return { ok: true, rollbackRestoredFiles: rollbackRestoredFiles.sort(), rollbackDeletedFiles: rollbackDeletedFiles.sort(), blockedReasons: [] };
}
