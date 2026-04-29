import fs from "fs";
import path from "path";

export type UILocalFileAdapterOptions = {
  projectRoot: string;
  allowWrites?: boolean;
  allowedExtensions?: string[];
  deniedPaths?: string[];
  maxFileBytes?: number;
};

const DEFAULT_ALLOWED_EXTENSIONS = [".ts", ".tsx", ".js", ".jsx", ".json", ".css", ".md"];
const DEFAULT_DENIED_SEGMENTS = ["release-evidence/runtime", "node_modules", ".git", "dist", "build"];
const SENSITIVE_NAME_PATTERN = /(^|\/)(\.env(\..+)?|.*secret.*|.*\.key$|.*\.pem$|.*\.p12$|.*\.pfx$|.*\.crt$|.*\.cert$|id_rsa|id_dsa|id_ed25519)$/i;
const DEFAULT_MAX_FILE_BYTES = 1024 * 1024;

function normalizedRel(relPath: string): string { return relPath.replace(/\\/g, "/"); }

export function validateUILocalFileAdapterOptions(options: UILocalFileAdapterOptions): { valid: boolean; issues: string[] } {
  const issues: string[] = [];
  if (!options?.projectRoot) issues.push("projectRoot is required");
  if (options?.maxFileBytes !== undefined && (!Number.isInteger(options.maxFileBytes) || options.maxFileBytes <= 0)) issues.push("maxFileBytes must be a positive integer");
  return { valid: issues.length === 0, issues };
}

export function createUILocalFileAdapter(options: UILocalFileAdapterOptions) {
  const validation = validateUILocalFileAdapterOptions(options);
  if (!validation.valid) throw new Error(`UILocalFileAdapter options invalid: ${validation.issues.join("; ")}`);

  const root = path.resolve(options.projectRoot);
  const allowWrites = options.allowWrites === true;
  const allowedExtensions = (options.allowedExtensions?.length ? options.allowedExtensions : DEFAULT_ALLOWED_EXTENSIONS).map((ext) => ext.toLowerCase());
  const deniedPaths = [...DEFAULT_DENIED_SEGMENTS, ...(options.deniedPaths ?? [])].map((item) => item.toLowerCase());
  const maxFileBytes = options.maxFileBytes ?? DEFAULT_MAX_FILE_BYTES;

  const assertAllowedPath = (inputPath: string) => {
    const absolute = path.resolve(root, inputPath);
    const rel = normalizedRel(path.relative(root, absolute));
    if (!rel || rel.startsWith("..") || path.isAbsolute(rel)) throw new Error(`LOCAL_FILE_ADAPTER_PATH_OUTSIDE_ROOT:${inputPath}`);
    const relLower = rel.toLowerCase();
    if (deniedPaths.some((denied) => relLower === denied || relLower.startsWith(`${denied}/`) || relLower.includes(`/${denied}/`))) throw new Error(`LOCAL_FILE_ADAPTER_PATH_DENIED:${rel}`);
    if (SENSITIVE_NAME_PATTERN.test(relLower)) throw new Error(`LOCAL_FILE_ADAPTER_SENSITIVE_PATH_DENIED:${rel}`);
    const ext = path.extname(rel).toLowerCase();
    if (!allowedExtensions.includes(ext)) throw new Error(`LOCAL_FILE_ADAPTER_EXTENSION_DENIED:${rel}`);
    return { absolute, rel };
  };

  return {
    kind: "local" as const,
    allowWrites,
    projectRoot: root,
    allowedExtensions,
    deniedPaths,
    maxFileBytes,
    readFile(filePath: string): string {
      const { absolute } = assertAllowedPath(filePath);
      return fs.readFileSync(absolute, "utf8");
    },
    writeFile(filePath: string, content: string): void {
      if (!allowWrites) throw new Error("LOCAL_FILE_ADAPTER_WRITES_DISABLED");
      const { absolute } = assertAllowedPath(filePath);
      const size = Buffer.byteLength(content, "utf8");
      if (size > maxFileBytes) throw new Error(`LOCAL_FILE_ADAPTER_MAX_BYTES_EXCEEDED:${size}:${maxFileBytes}`);
      fs.mkdirSync(path.dirname(absolute), { recursive: true });
      fs.writeFileSync(absolute, content, "utf8");
    },
    exists(filePath: string): boolean {
      const { absolute } = assertAllowedPath(filePath);
      return fs.existsSync(absolute);
    },
    listFiles(): string[] {
      const out: string[] = [];
      const walk = (dir: string) => {
        for (const name of fs.readdirSync(dir)) {
          const full = path.join(dir, name);
          const rel = normalizedRel(path.relative(root, full));
          const stat = fs.statSync(full);
          if (stat.isDirectory()) {
            if (deniedPaths.some((denied) => rel.toLowerCase() === denied || rel.toLowerCase().startsWith(`${denied}/`) || rel.toLowerCase().includes(`/${denied}/`))) continue;
            walk(full);
          } else {
            try { assertAllowedPath(rel); out.push(rel); } catch {}
          }
        }
      };
      walk(root);
      return out.sort((a, b) => a.localeCompare(b));
    }
  };
}
