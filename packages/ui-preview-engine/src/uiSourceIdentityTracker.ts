import crypto from "crypto";
import ts from "typescript";
import { UI_SOURCE_IDENTITY_CLAIM_BOUNDARY, type UISourceElementKind, type UISourceIdentity, type UISourceIdentityConfidence, type UISourceIdentityTrackingResult } from "./uiSourceIdentityModel";

function hash(input: string): string { return crypto.createHash("sha256").update(input).digest("hex").slice(0, 16); }
function normalize(v: string): string { return v.replace(/\s+/g, " ").trim(); }
function jsxTagName(node: ts.Node): string | undefined {
  if (ts.isJsxElement(node)) return node.openingElement.tagName.getText();
  if (ts.isJsxSelfClosingElement(node)) return node.tagName.getText();
  return undefined;
}
function jsxKind(node: ts.Node): UISourceElementKind | undefined {
  if (ts.isJsxElement(node)) return "jsxElement";
  if (ts.isJsxSelfClosingElement(node)) return "jsxSelfClosingElement";
  if (ts.isJsxFragment(node)) return "jsxFragment";
  if (ts.isJsxText(node)) return "jsxText";
  return undefined;
}
function createIdentity(filePath: string, sf: ts.SourceFile, node: ts.Node, componentName?: string, exportName?: string): UISourceIdentity {
  const kind = jsxKind(node);
  const tag = jsxTagName(node);
  const propsText = ts.isJsxElement(node) ? node.openingElement.attributes.getText(sf) : ts.isJsxSelfClosingElement(node) ? node.attributes.getText(sf) : "";
  const childText = ts.isJsxElement(node) ? node.children.map((c) => normalize(c.getText(sf))).join("|") : ts.isJsxFragment(node) ? node.children.map((c) => normalize(c.getText(sf))).join("|") : "";
  const childShape = ts.isJsxElement(node) ? node.children.map((c) => ts.SyntaxKind[c.kind]).join(",") : ts.isJsxFragment(node) ? node.children.map((c) => ts.SyntaxKind[c.kind]).join(",") : "";
  const start = sf.getLineAndCharacterOfPosition(node.getStart(sf)).line + 1;
  const end = sf.getLineAndCharacterOfPosition(node.getEnd()).line + 1;
  const sig = `${filePath}|${componentName ?? ""}|${exportName ?? ""}|${kind ?? ""}|${tag ?? ""}|${normalize(propsText)}|${normalize(childText)}|${childShape}`;
  return {
    identityId: hash(sig),
    sourceFilePath: filePath,
    exportName,
    componentName,
    jsxKind: kind,
    tagName: tag,
    componentRef: tag && /^[A-Z]/.test(tag) ? tag : undefined,
    propSignatureHash: hash(normalize(propsText)),
    textSignatureHash: hash(normalize(childText)),
    childShapeHash: hash(childShape),
    sourceStartLine: start,
    sourceEndLine: end,
    confidence: kind ? "high" : "low",
    issues: [],
    claimBoundary: UI_SOURCE_IDENTITY_CLAIM_BOUNDARY
  };
}

export function trackUISourceIdentities(projectFiles: Record<string, string>): UISourceIdentityTrackingResult {
  const identities: UISourceIdentity[] = [];
  const issues: UISourceIdentityTrackingResult["issues"] = [];
  for (const [filePath, source] of Object.entries(projectFiles).sort((a, b) => a[0].localeCompare(b[0]))) {
    if (!/\.(tsx|jsx|ts|js)$/.test(filePath)) continue;
    const sf = ts.createSourceFile(filePath, source, ts.ScriptTarget.Latest, true, filePath.endsWith("x") ? ts.ScriptKind.TSX : ts.ScriptKind.TS);
    if (sf.parseDiagnostics.length) {
      issues.push(...sf.parseDiagnostics.map((d) => ({ sourceFilePath: filePath, message: ts.flattenDiagnosticMessageText(d.messageText, "\n"), severity: "error" as const })));
      continue;
    }
    const exportMap = new Map<string, "default" | "named">();
    sf.forEachChild((node) => {
      if (ts.isFunctionDeclaration(node) && node.name && node.modifiers?.some((m) => m.kind === ts.SyntaxKind.ExportKeyword)) exportMap.set(node.name.text, node.modifiers.some((m) => m.kind === ts.SyntaxKind.DefaultKeyword) ? "default" : "named");
      if (ts.isVariableStatement(node) && node.modifiers?.some((m) => m.kind === ts.SyntaxKind.ExportKeyword)) for (const d of node.declarationList.declarations) if (ts.isIdentifier(d.name)) exportMap.set(d.name.text, "named");
      if (ts.isExportAssignment(node) && ts.isIdentifier(node.expression)) exportMap.set(node.expression.text, "default");
    });
    const visit = (node: ts.Node, componentName?: string, exportName?: string) => {
      const isComponent = (name?: string) => !!name && /^[A-Z]/.test(name);
      if (ts.isFunctionDeclaration(node) && node.name && isComponent(node.name.text)) componentName = node.name.text;
      if (ts.isVariableDeclaration(node) && ts.isIdentifier(node.name) && isComponent(node.name.text)) componentName = node.name.text;
      if (componentName && exportMap.has(componentName)) exportName = exportMap.get(componentName);
      if (ts.isJsxElement(node) || ts.isJsxSelfClosingElement(node) || ts.isJsxFragment(node)) identities.push(createIdentity(filePath, sf, node, componentName, exportName));
      ts.forEachChild(node, (child) => visit(child, componentName, exportName));
    };
    visit(sf);
  }
  const identityMap = Object.fromEntries(identities.map((i) => [i.identityId, i]));
  return { identities, identityMap, issues, caveat: UI_SOURCE_IDENTITY_CLAIM_BOUNDARY };
}

export function resolveIdentityConfidence(identity?: UISourceIdentity): UISourceIdentityConfidence {
  if (!identity) return "low";
  if (identity.issues.length) return "medium";
  return identity.confidence;
}
