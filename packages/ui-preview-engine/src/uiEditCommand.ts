export type UIEditCommandId = string;
export type UIEditCommandKind =
  | "add"
  | "remove"
  | "move"
  | "resize"
  | "duplicate"
  | "replace"
  | "rewriteText"
  | "restyle"
  | "retheme"
  | "addPage"
  | "removePage"
  | "changeLayout"
  | "changeResponsiveBehavior"
  | "bindData"
  | "bindAction"
  | "connectForm";

export type UIEditCommandSource = "typedChat" | "spokenChat" | "systemSuggestion" | "testFixture";
export type UIEditCommandReferenceKind = "selectedElement" | "semanticLabel" | "semanticRole" | "page" | "nodeId" | "ambiguous" | "globalTheme" | "unknown";
export type UIEditCommandTargetReference = {
  rawReference: string;
  normalizedReference: string;
  referenceKind: UIEditCommandReferenceKind;
  nodeId?: string;
  pageId?: string;
  confidence: number;
  requiresResolution: boolean;
};
export type UIEditCommandTarget = { reference: UIEditCommandTargetReference };
export type UIEditCommandPayload = { value?: string; destination?: string; replacement?: string; quote?: string; [key: string]: unknown };
export type UIEditCommandSafety = {
  parserOnly: true;
  impliesPreviewMutation: false;
  impliesSourceSync: false;
  requiresConfirmation: boolean;
  requiresResolution: boolean;
};
export type UIEditCommandClaimBoundary = {
  parserOnly: true;
  mutatesDocument: false;
  updatesPreview: false;
  syncsSourceFiles: false;
  provesLiveUIBuilderCompletion: false;
  caveat: string;
};
export type UIEditCommand = {
  id: UIEditCommandId;
  kind: UIEditCommandKind;
  source: UIEditCommandSource;
  rawText: string;
  normalizedText: string;
  target: UIEditCommandTarget;
  payload: UIEditCommandPayload;
  safety: UIEditCommandSafety;
  createdAt: string;
  claimBoundary: UIEditCommandClaimBoundary;
};
export type UIEditCommandParseResult = { ok: boolean; command?: UIEditCommand; issues: string[] };
export type UIEditCommandValidationResult = { valid: boolean; issues: string[] };

export const UI_EDIT_COMMAND_CAVEAT = "This parser creates structured UI edit commands only. It does not mutate the UI document, does not update the preview, does not sync source files, and does not prove full live visual UI builder completion.";

const REQUIRED_KINDS: UIEditCommandKind[] = ["add", "remove", "move", "resize", "duplicate", "replace", "rewriteText", "restyle", "retheme", "addPage", "removePage", "changeLayout", "changeResponsiveBehavior", "bindData", "bindAction", "connectForm"];
const HIGH_IMPACT_KINDS = new Set<UIEditCommandKind>(["remove", "removePage", "replace", "bindData", "bindAction", "connectForm", "retheme"]);
const SEMANTIC_LABELS = ["hero", "hero image", "booking form", "pricing section", "testimonials", "navbar", "footer", "button", "card"];
const SEMANTIC_ROLES = ["button", "card", "form", "navbar", "footer"];

function toPageId(value: string): string {
  return value.trim().toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "");
}

function extractPageReference(normalized: string): { rawReference: string; normalizedReference: string; pageId: string } | undefined {
  const patterns: RegExp[] = [
    /\b(?:add|create|insert)\s+(?:a\s+)?page\s+called\s+([a-z0-9- ]+)$/,
    /\b(?:add|create|insert)\s+page\s+([a-z0-9- ]+)$/,
    /\b(?:add|create|insert)\s+([a-z0-9- ]+)\s+page$/,
    /\b(?:remove|delete)\s+(?:the\s+)?([a-z0-9- ]+)\s+page$/,
  ];
  for (const pattern of patterns) {
    const match = normalized.match(pattern);
    if (!match) continue;
    const name = match[1].trim();
    const pageId = toPageId(name);
    if (!pageId) continue;
    return { rawReference: match[0], normalizedReference: name, pageId };
  }
  return undefined;
}

export function normalizeUIEditRequest(text: string): string {
  return text.trim().toLowerCase().replace(/\s+/g, " ");
}

export function classifyUIEditCommandKind(text: string): UIEditCommandKind | "unknown" {
  const t = normalizeUIEditRequest(text);
  if (/\b(add|insert|create)\b.*\bpage\b/.test(t)) return "addPage";
  if (/\b(remove|delete)\b.*\bpage\b/.test(t)) return "removePage";
  if (/\bretheme\b|\btheme\b.*\bto\b/.test(t)) return "retheme";
  if (/\brewrite\b|\bheadline\b.*\bto\b/.test(t)) return "rewriteText";
  if (/\brestyle\b|\bmake\b.*\b(background|color|blue|cleaner)\b/.test(t)) return /\bmobile\b/.test(t) ? "changeResponsiveBehavior" : "restyle";
  if (/\bchange\b.*\blayout\b|\btwo columns\b/.test(t)) return "changeLayout";
  if (/\bmobile\b|\bresponsive\b/.test(t)) return "changeResponsiveBehavior";
  if (/\bconnect\b.*\bform\b/.test(t)) return "connectForm";
  if (/\bbind\b.*\bto\b.*\b(checkout|action)\b/.test(t)) return "bindAction";
  if (/\bbind\b/.test(t)) return "bindData";
  if (/\breplace\b/.test(t)) return "replace";
  if (/\bduplicate\b|\bcopy\b/.test(t)) return "duplicate";
  if (/\bresize\b/.test(t)) return "resize";
  if (/\bmove\b/.test(t)) return "move";
  if (/\bremove\b|\bdelete\b/.test(t)) return "remove";
  if (/\badd\b/.test(t)) return "add";
  return "unknown";
}

export function parseUIEditTarget(text: string, options?: { selectedNodeId?: string; kind?: UIEditCommandKind | "unknown" }): UIEditCommandTarget {
  const normalized = normalizeUIEditRequest(text);
  const selectedRef = /\b(this|that)\b/.test(normalized);
  if (selectedRef) {
    return { reference: { rawReference: "this", normalizedReference: "this", referenceKind: "selectedElement", nodeId: options?.selectedNodeId, confidence: options?.selectedNodeId ? 0.95 : 0.55, requiresResolution: !options?.selectedNodeId } };
  }
  const nodeId = normalized.match(/\bnode:[a-z0-9:_-]+\b/)?.[0]?.replace("node:", "");
  if (nodeId) return { reference: { rawReference: `node:${nodeId}`, normalizedReference: nodeId, referenceKind: "nodeId", nodeId, confidence: 0.99, requiresResolution: false } };
  if (options?.kind === "retheme") return { reference: { rawReference: "global theme", normalizedReference: "global theme", referenceKind: "globalTheme", confidence: 0.99, requiresResolution: false } };
  const page = extractPageReference(normalized);
  if (page) return { reference: { rawReference: page.rawReference, normalizedReference: page.normalizedReference, referenceKind: "page", pageId: page.pageId, confidence: 0.9, requiresResolution: false } };
  for (const role of SEMANTIC_ROLES) if (normalized.includes(role)) return { reference: { rawReference: role, normalizedReference: role, referenceKind: "semanticRole", confidence: 0.85, requiresResolution: false } };
  for (const label of SEMANTIC_LABELS) if (normalized.includes(label)) return { reference: { rawReference: label, normalizedReference: label, referenceKind: "semanticLabel", confidence: 0.87, requiresResolution: false } };
  return { reference: { rawReference: normalized, normalizedReference: normalized, referenceKind: "unknown", confidence: 0.2, requiresResolution: true } };
}

function buildPayload(kind: UIEditCommandKind | "unknown", text: string): UIEditCommandPayload {
  const quote = text.match(/"([^"]+)"/)?.[1];
  const normalized = normalizeUIEditRequest(text);
  return { quote, value: quote ?? normalized, replacement: normalized.match(/\bwith\b\s+(.+)$/)?.[1], destination: normalized.match(/\bunder\b\s+(.+)$/)?.[1] };
}

export function createUIEditCommandId(parts?: { source?: UIEditCommandSource; normalizedText?: string; createdAt?: string }): UIEditCommandId {
  const source = parts?.source ?? "typedChat";
  const text = (parts?.normalizedText ?? "command").slice(0, 40).replace(/[^a-z0-9]+/g, "-");
  const created = (parts?.createdAt ?? new Date().toISOString()).replace(/[^0-9]/g, "").slice(0, 14);
  return `uiecmd:${source}:${created}:${text}`;
}

export function parseUIEditCommand(input: { text: string; source: UIEditCommandSource; selectedNodeId?: string; createdAt?: string }): UIEditCommandParseResult {
  const rawText = input.text;
  const normalizedText = normalizeUIEditRequest(rawText);
  const kind = classifyUIEditCommandKind(normalizedText);
  if (kind === "unknown") return { ok: false, issues: ["unknown command kind"] };
  const target = parseUIEditTarget(normalizedText, { selectedNodeId: input.selectedNodeId, kind });
  const createdAt = input.createdAt ?? new Date().toISOString();
  const command: UIEditCommand = {
    id: createUIEditCommandId({ source: input.source, normalizedText, createdAt }),
    kind,
    source: input.source,
    rawText,
    normalizedText,
    target,
    payload: buildPayload(kind, rawText),
    safety: {
      parserOnly: true,
      impliesPreviewMutation: false,
      impliesSourceSync: false,
      requiresConfirmation: HIGH_IMPACT_KINDS.has(kind),
      requiresResolution: target.reference.requiresResolution,
    },
    createdAt,
    claimBoundary: { parserOnly: true, mutatesDocument: false, updatesPreview: false, syncsSourceFiles: false, provesLiveUIBuilderCompletion: false, caveat: UI_EDIT_COMMAND_CAVEAT },
  };
  return { ok: true, command, issues: [] };
}

export function validateUIEditCommand(command: Partial<UIEditCommand>): UIEditCommandValidationResult {
  const issues: string[] = [];
  if (!command.id) issues.push("id missing");
  if (!command.kind || !REQUIRED_KINDS.includes(command.kind)) issues.push("kind invalid/unknown");
  if (!command.source || !["typedChat", "spokenChat", "systemSuggestion", "testFixture"].includes(command.source)) issues.push("source invalid");
  if (!command.rawText) issues.push("rawText missing");
  if (!command.target) issues.push("target missing");
  if (!command.payload) issues.push("payload missing");
  if (!command.claimBoundary) issues.push("claimBoundary missing");
  if (command.claimBoundary?.updatesPreview || command.claimBoundary?.mutatesDocument || command.claimBoundary?.syncsSourceFiles) issues.push("command claims to mutate preview/source");
  if (command.source === "spokenChat" && command.claimBoundary?.parserOnly !== true) issues.push("source is spokenChat but uses a different schema/path from typedChat");
  const refKind = command.target?.reference?.referenceKind;
  if ((refKind === "ambiguous" || refKind === "unknown") && command.target?.reference?.requiresResolution === false) issues.push("requiresResolution is false for ambiguous/unknown references");
  return { valid: issues.length === 0, issues };
}

export function serializeUIEditCommand(command: UIEditCommand): string { return JSON.stringify(command, null, 2); }
export function parseSerializedUIEditCommand(json: string): UIEditCommand { return JSON.parse(json) as UIEditCommand; }
