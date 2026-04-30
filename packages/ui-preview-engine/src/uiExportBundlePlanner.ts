import crypto from "crypto";
import { type UIExportBundleFile, type UIExportBundleManifest, type UIExportDeployIssue } from "./uiExportDeployModel";

type Input = {
  fullProjectGenerationPlan?: { files?: Array<{ path?: string; contents?: string; referenceOnly?: boolean }> };
  sourcePatchPlan?: { operations?: Array<{ operationId?: string; target?: { filePath?: string } }> };
  sourceFiles?: Record<string, string>;
};

const normalizePath = (inputPath: string): string => inputPath.replace(/\\/g, "/").replace(/^\.\//, "").trim();
const isBuildOutput = (p: string): boolean => /(^|\/)(dist|build|out)\//.test(p);
const isUnsafePath = (p: string): boolean => (
  !p
  || p.startsWith("/")
  || /^[A-Za-z]:\//.test(p)
  || p === ".."
  || p.includes("../")
  || p.startsWith("release-evidence/runtime/")
  || /(^|\/)\.env(\.|$)?/.test(p)
  || /secret|private.?key|id_rsa|\.pem|\.p12/i.test(p)
  || p.includes("node_modules/")
  || isBuildOutput(p)
);

export function createUIExportBundleManifest(input: Input): UIExportBundleManifest {
  const issues: UIExportDeployIssue[] = [];
  const byPath = new Map<string, UIExportBundleFile>();
  const add = (rawPath: string | undefined, source: UIExportBundleFile["source"], contents?: string, generatedReference = false): void => {
    const filePath = normalizePath(String(rawPath ?? ""));
    if (!filePath) {
      issues.push({ code: "empty-path", message: "Empty path", severity: "error" });
      return;
    }
    if (isUnsafePath(filePath) && !(generatedReference && isBuildOutput(filePath))) {
      issues.push({ code: "unsafe-path", message: `Unsafe path: ${filePath}`, filePath, severity: "error" });
      return;
    }
    const bytes = Buffer.byteLength(contents ?? input.sourceFiles?.[filePath] ?? "", "utf8");
    byPath.set(filePath, { filePath, bytes, source, generatedReference });
  };

  try {
    Object.entries(input.sourceFiles ?? {}).forEach(([path, contents]) => add(path, "sourceFile", contents));
    (input.fullProjectGenerationPlan?.files ?? []).forEach((file) => add(file.path, "fullProjectPlan", file.contents, Boolean(file.referenceOnly)));
    (input.sourcePatchPlan?.operations ?? []).forEach((op) => add(op.target?.filePath, "sourcePatchPlan"));
  } catch {
    issues.push({ code: "malformed-input", message: "Malformed input encountered", severity: "error" });
  }

  const files = [...byPath.values()].sort((a, b) => a.filePath.localeCompare(b.filePath));
  const totalBytes = files.reduce((sum, file) => sum + file.bytes, 0);
  const requiresSourceProof = files.some((f) => f.source !== "generatedReference") && !input.sourceFiles;
  if (requiresSourceProof) {
    issues.push({ code: "missing-source-proof", message: "Source files missing while bundle requires source proof", severity: "error" });
  }
  const bundleManifestId = `bundle-${crypto.createHash("sha256").update(JSON.stringify(files.map((f) => [f.filePath, f.bytes, f.source, f.generatedReference]))).digest("hex").slice(0, 16)}`;

  return { bundleManifestId, files, fileCount: files.length, totalBytes, hasUnsafeFiles: issues.some((i) => i.severity === "error"), issues, requiresSourceProof };
}
