import type { UIFullProjectFilePlan, UIFullProjectNormalizationIssue } from "./uiFullProjectGenerationPlan";

const SECRET_RE = /(^|\/)\.env(\.|$)|private[_-]?key|id_rsa|secret|credential|token/i;
const SAFE_NAME_RE = /^[A-Za-z0-9._\-/]+$/;

export function normalizeProjectSlug(name: string): string {
  const clean = String(name || "project").toLowerCase().replace(/[^a-z0-9\s-_]/g, " ").trim().replace(/[\s_]+/g, "-").replace(/-+/g, "-");
  return clean || "project";
}

export function normalizeProjectPath(path: string): { path?: string; issues: string[] } {
  const issues: string[] = [];
  const raw = String(path ?? "").trim();
  if (!raw) return { issues: ["empty file path"] };
  const posix = raw.replace(/\\+/g, "/").replace(/\/+/g, "/");
  if (posix.startsWith("/") || /^[a-zA-Z]:\//.test(posix)) issues.push("absolute path rejected");
  const parts = posix.split("/").filter(Boolean);
  if (parts.some((p) => p === "..")) issues.push("path traversal rejected");
  const normalized = parts.join("/");
  if (!normalized) issues.push("empty file path");
  if (normalized.startsWith("release-evidence/runtime/") || normalized === "release-evidence/runtime") issues.push("reserved runtime evidence path rejected");
  if (!SAFE_NAME_RE.test(normalized)) issues.push("unsafe name rejected");
  return issues.length ? { issues } : { path: normalized, issues: [] };
}

export function detectProjectFileConflicts(files: UIFullProjectFilePlan[]): UIFullProjectNormalizationIssue[] {
  const seen = new Map<string, number>();
  const issues: UIFullProjectNormalizationIssue[] = [];
  for (const file of files) {
    const normalized = normalizeProjectPath(file.path);
    if (!normalized.path) continue;
    seen.set(normalized.path, (seen.get(normalized.path) ?? 0) + 1);
    if (SECRET_RE.test(normalized.path) && !file.placeholderSafe) issues.push({ code: "secret-path", message: "secret-looking path rejected unless placeholder-safe", filePath: normalized.path });
  }
  for (const [filePath, count] of [...seen.entries()].sort((a, b) => a[0].localeCompare(b[0]))) {
    if (count > 1) issues.push({ code: "duplicate-path", message: `duplicate normalized path detected: ${filePath}`, filePath });
  }
  return issues;
}

export function sortProjectFilePaths(paths: string[]): string[] {
  return [...new Set(paths)].sort((a, b) => a.localeCompare(b));
}
