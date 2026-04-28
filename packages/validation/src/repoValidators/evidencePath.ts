import fs from "fs";
import path from "path";

const WORKSPACES_PREFIX = /^\/workspaces\/[^/]+\/(.+)$/;

export function resolveEvidencePath(root: string, proofPath: string): string {
  if (fs.existsSync(proofPath)) return proofPath;

  const match = proofPath.match(WORKSPACES_PREFIX);
  if (!match) return proofPath;

  const repoRelativePath = match[1];
  const repoRoot = path.resolve(root);
  const candidate = path.resolve(repoRoot, repoRelativePath);
  const relative = path.relative(repoRoot, candidate);
  const escapesRoot = relative.startsWith("..") || path.isAbsolute(relative);

  if (escapesRoot) return proofPath;
  if (!fs.existsSync(candidate)) return proofPath;
  return candidate;
}
