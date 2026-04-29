export type UISourceElementKind = "jsxElement" | "jsxSelfClosingElement" | "jsxFragment" | "jsxText";
export type UISourceIdentityConfidence = "high" | "medium" | "low";

export type UISourceIdentity = {
  identityId: string;
  sourceFilePath: string;
  exportName?: string;
  componentName?: string;
  routePath?: string;
  nodeId?: string;
  jsxKind?: UISourceElementKind;
  tagName?: string;
  componentRef?: string;
  propSignatureHash: string;
  textSignatureHash: string;
  childShapeHash: string;
  sourceStartLine?: number;
  sourceEndLine?: number;
  confidence: UISourceIdentityConfidence;
  issues: string[];
  claimBoundary: string;
};

export type UISourceIdentityMap = Record<string, UISourceIdentity>;
export type UISourceIdentityIssue = { sourceFilePath: string; message: string; severity: "warning" | "error" };
export type UISourceIdentityTrackingResult = { identities: UISourceIdentity[]; identityMap: UISourceIdentityMap; issues: UISourceIdentityIssue[]; caveat: string };

export const UI_SOURCE_IDENTITY_CLAIM_BOUNDARY = "Parser-backed source identity is best-effort and does not guarantee semantic runtime equivalence.";
