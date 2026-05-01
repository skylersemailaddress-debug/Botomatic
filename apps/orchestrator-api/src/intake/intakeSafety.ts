const BLOCKED_EXTENSIONS = new Set([
  ".exe",
  ".dll",
  ".bat",
  ".cmd",
  ".sh",
  ".ps1",
  ".apk",
  ".dmg",
  ".pkg",
]);

export function isBlockedFileExtension(fileName: string): boolean {
  const idx = fileName.lastIndexOf(".");
  if (idx < 0) return false;
  const ext = fileName.slice(idx).toLowerCase();
  return BLOCKED_EXTENSIONS.has(ext);
}

export function suspiciousBinaryHook(fileName: string): { status: "pending"; detail: string } {
  return {
    status: "pending",
    detail: `Suspicious binary scan integration pending for ${fileName}; treat as non-launch evidence until completed.`,
  };
}
