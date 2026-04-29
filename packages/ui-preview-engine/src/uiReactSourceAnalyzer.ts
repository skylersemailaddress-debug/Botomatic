import { type FileSystemAdapter } from "./uiSourceApply";

export type UIReactComponentExport = { exportKind: "default" | "named"; exportName: string; componentName?: string; hasJsxReturn: boolean };
export type UIReactRouteFile = { filePath: string; routeKind: "page" | "layout" | "route"; supported: boolean };
export type UIReactSourceAnalysis = {
  filePath: string;
  supported: boolean;
  unsupportedReason?: string;
  isRouteFile: boolean;
  routeFile?: UIReactRouteFile;
  imports: string[];
  exports: UIReactComponentExport[];
  componentNames: string[];
  hasJsxReturnBlock: boolean;
};

export function analyzeReactSourceFile(filePath: string, sourceText: string): UIReactSourceAnalysis {
  const normalized = filePath.replace(/\\/g, "/");
  const supported = /\.(tsx|jsx|ts)$/.test(normalized);
  const routeMatch = normalized.match(/\/(page|layout)\.tsx$|\/route\.ts$/);
  const routeKind = routeMatch?.[1] === "page" ? "page" : routeMatch?.[1] === "layout" ? "layout" : normalized.endsWith("/route.ts") ? "route" : undefined;
  const imports = [...sourceText.matchAll(/import\s+[^;]*?from\s+["']([^"']+)["']/g)].map((m) => m[1]);
  const hasJsxReturnBlock = /return\s*\(\s*</s.test(sourceText) || /=>\s*\(\s*</s.test(sourceText);
  const named = [...sourceText.matchAll(/export\s+(?:const|function)\s+([A-Z][A-Za-z0-9_]*)/g)].map((m) => m[1]);
  const defaultFn = sourceText.match(/export\s+default\s+function\s+([A-Z][A-Za-z0-9_]*)?/);
  const defaultIdent = sourceText.match(/export\s+default\s+([A-Z][A-Za-z0-9_]*)\s*;/);
  const exports: UIReactComponentExport[] = [];
  if (defaultFn) exports.push({ exportKind: "default", exportName: "default", componentName: defaultFn[1] ?? "default", hasJsxReturn: hasJsxReturnBlock });
  else if (defaultIdent) exports.push({ exportKind: "default", exportName: "default", componentName: defaultIdent[1], hasJsxReturn: hasJsxReturnBlock });
  for (const n of named) exports.push({ exportKind: "named", exportName: n, componentName: n, hasJsxReturn: hasJsxReturnBlock });
  const componentNames = [...new Set(exports.map((e) => e.componentName).filter(Boolean) as string[])];
  return {
    filePath,
    supported,
    unsupportedReason: supported ? undefined : "unsupported extension",
    isRouteFile: Boolean(routeKind),
    routeFile: routeKind ? { filePath, routeKind, supported } : undefined,
    imports,
    exports,
    componentNames,
    hasJsxReturnBlock
  };
}

export function analyzeReactProjectFiles(fileSystemAdapter: FileSystemAdapter, options: { glob?: string } = {}): UIReactSourceAnalysis[] {
  const files = fileSystemAdapter.listFiles?.(options.glob ?? "**/*") ?? [];
  return files.filter((f) => /\.(tsx|jsx|ts|js)$/.test(f)).map((filePath) => analyzeReactSourceFile(filePath, fileSystemAdapter.readFile(filePath)));
}
