import { type UIApiEndpoint, type UIDataStateApiWiringInput, type UIDataStateApiWiringIssue, type UIDataStateApiWiringResult } from "./uiDataStateApiWiringModel";

const UNSAFE = /(script|javascript:|data:|file:|<|>|\{|\}|;|eval\(|new\s+function|=>)/i;
const SECRET = /(secret|token|password|apikey|api-key|bearer\s+[a-z0-9\-_\.]+)/i;

const stableSort = <T>(items: T[], key: (x: T) => string) => [...items].sort((a, b) => key(a).localeCompare(key(b)));
const isJson = (v: unknown): boolean => { try { JSON.stringify(v); return typeof v !== "function" && v !== undefined; } catch { return false; } };
const isSafeExpr = (v: string): boolean => !!v.trim() && !UNSAFE.test(v);

export const normalizeBindingName = (name: string): string => name.trim().toLowerCase().replace(/[\s_]+/g, "-").replace(/[^a-z0-9\-]/g, "").replace(/-+/g, "-");

function validateEndpoint(endpoint: UIApiEndpoint, issues: UIDataStateApiWiringIssue[], path: string): void {
  if (!endpoint.endpointId?.trim()) issues.push({ code: "missing-endpoint-id", message: "endpointId required", path });
  if (!["GET", "POST", "PUT", "PATCH", "DELETE"].includes(endpoint.method)) issues.push({ code: "invalid-method", message: "unsupported method", path });
  if (!endpoint.url?.trim()) issues.push({ code: "missing-url", message: "url required", path });
  const url = endpoint.url?.trim() ?? "";
  const lower = url.toLowerCase();
  if (lower.startsWith("http://") && !(endpoint.devAllowed && (lower.includes("localhost") || lower.includes("127.0.0.1")))) issues.push({ code: "unsafe-scheme", message: "http:// rejected", path });
  if (lower.startsWith("javascript:") || lower.startsWith("data:") || lower.startsWith("file:")) issues.push({ code: "unsafe-scheme", message: "javascript:/data:/file: rejected", path });
  if ((lower.includes("localhost") || lower.includes("127.0.0.1")) && !endpoint.devAllowed) issues.push({ code: "dev-endpoint-blocked", message: "localhost/127.0.0.1 rejected by default", path });
  if (lower.startsWith("https://") && !endpoint.externalAllowed) issues.push({ code: "external-not-allowed", message: "https external endpoint requires externalAllowed=true", path });
  for (const [k, v] of Object.entries(endpoint.headers ?? {})) if (SECRET.test(`${k}:${v}`)) issues.push({ code: "secret-header", message: "secret-looking header literal rejected", path });
}

export function normalizeAndValidateUIDataStateApiWiring(input: UIDataStateApiWiringInput): UIDataStateApiWiringResult {
  const issues: UIDataStateApiWiringIssue[] = [];
  const normalized = {
    bindings: stableSort((input.bindings ?? []).map((b) => ({ ...b, normalizedBindingName: normalizeBindingName(b.bindingName ?? b.bindingId) })), (b) => `${b.bindingId}:${b.nodeId}`),
    stateBindings: stableSort([...(input.stateBindings ?? [])], (s) => `${s.stateKey}:${s.scope}`),
    stateActions: stableSort([...(input.stateActions ?? [])], (a) => `${a.actionId}:${a.stateKey}`),
    apiEndpoints: stableSort([...(input.apiEndpoints ?? [])], (e) => e.endpointId),
    apiRequestBindings: stableSort([...(input.apiRequestBindings ?? [])], (r) => r.requestBindingId)
  };

  normalized.bindings.forEach((b, i) => {
    const path = `bindings[${i}]`;
    if (!b.nodeId?.trim()) issues.push({ code: "missing-node", message: "nodeId required", path });
    if (!b.propertyPath?.trim()) issues.push({ code: "missing-property-path", message: "property path required", path });
    if (!isSafeExpr(b.expression ?? "")) issues.push({ code: "unsafe-expression", message: "binding expression must be simple/safe", path });
  });
  normalized.stateBindings.forEach((s, i) => {
    const path = `stateBindings[${i}]`;
    if (!s.stateKey?.trim()) issues.push({ code: "missing-state-key", message: "stateKey required", path });
    if (!["local", "page", "app"].includes(s.scope)) issues.push({ code: "invalid-state-scope", message: "invalid scope", path });
    if (!isJson(s.initialValue) || (typeof s.initialValue === "string" && /(function\s*\(|=>|class\s+)/.test(s.initialValue))) issues.push({ code: "invalid-state-initial", message: "initialValue must be JSON-serializable and not source-code", path });
  });
  normalized.stateActions.forEach((a, i) => {
    const path = `stateActions[${i}]`;
    if (!["set", "toggle", "increment", "decrement", "reset", "append", "remove"].includes(a.actionType)) issues.push({ code: "unsupported-action", message: "unsupported action type", path });
    if (!a.stateKey?.trim()) issues.push({ code: "missing-target-state", message: "target stateKey required", path });
    if (typeof a.payload === "string" && /(=>|function\s*\(|\.|\[\])/.test(a.payload)) issues.push({ code: "unsafe-action-payload", message: "mutation/source-code payload rejected", path });
  });
  normalized.apiEndpoints.forEach((e, i) => validateEndpoint(e, issues, `apiEndpoints[${i}]`));
  const endpointIds = new Set(normalized.apiEndpoints.map((e) => e.endpointId));
  normalized.apiRequestBindings.forEach((r, i) => {
    const path = `apiRequestBindings[${i}]`;
    if (!endpointIds.has(r.endpointId)) issues.push({ code: "missing-endpoint", message: "endpointId must exist", path });
    if (!isJson(r.body) || !isJson(r.params)) issues.push({ code: "non-json-request", message: "request body/params must be JSON-serializable", path });
    r.responseMappings.forEach((m, idx) => {
      if (!m.propertyPath?.trim()) issues.push({ code: "missing-response-property-path", message: "response mapping property path required", path: `${path}.responseMappings[${idx}]` });
      if (!isSafeExpr(m.expression ?? "")) issues.push({ code: "unsafe-response-expression", message: "unsafe response mapping expression rejected", path: `${path}.responseMappings[${idx}]` });
    });
  });

  return { normalizedInput: normalized, issues: stableSort(issues, (x) => `${x.path}:${x.code}:${x.message}`) };
}
