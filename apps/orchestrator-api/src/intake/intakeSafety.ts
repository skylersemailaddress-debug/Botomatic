const BLOCKED_EXTENSIONS = new Set([
  // Executables & installers
  ".exe", ".dll", ".bat", ".cmd", ".com", ".msi", ".msp",
  // Shell / scripts (server-executed risk)
  ".sh", ".bash", ".zsh", ".fish", ".ps1", ".psm1", ".psd1", ".vbs", ".vbe",
  // Mobile / desktop apps
  ".apk", ".ipa", ".dmg", ".pkg", ".deb", ".rpm", ".snap",
  // Java bytecode
  ".class", ".jar", ".war", ".ear",
  // Native libraries
  ".so", ".dylib", ".sys", ".ko",
  // Other binary formats
  ".bin", ".out", ".elf",
]);

const SUSPICIOUS_EXTENSIONS = new Set([
  ".pyc", ".pyo",   // compiled Python bytecode
  ".wasm",          // WebAssembly
  ".o", ".obj",     // object files
  ".a", ".lib",     // static libraries
  ".pdb",           // debug symbols
]);

export function isBlockedFileExtension(fileName: string): boolean {
  const idx = fileName.lastIndexOf(".");
  if (idx < 0) return false;
  const ext = fileName.slice(idx).toLowerCase();
  return BLOCKED_EXTENSIONS.has(ext);
}

export type BinaryScanResult =
  | { status: "clean" }
  | { status: "blocked"; reason: string }
  | { status: "suspicious"; reason: string };

export function suspiciousBinaryHook(fileName: string): BinaryScanResult {
  const idx = fileName.lastIndexOf(".");
  const ext = idx >= 0 ? fileName.slice(idx).toLowerCase() : "";

  if (BLOCKED_EXTENSIONS.has(ext)) {
    return { status: "blocked", reason: `File type '${ext}' is not permitted` };
  }
  if (SUSPICIOUS_EXTENSIONS.has(ext)) {
    console.warn(
      JSON.stringify({
        event: "suspicious_file_flagged",
        fileName,
        ext,
        reason: "Compiled binary or bytecode — contents not inspectable",
      })
    );
    return { status: "suspicious", reason: `File type '${ext}' is a compiled binary and cannot be code-reviewed` };
  }
  return { status: "clean" };
}
