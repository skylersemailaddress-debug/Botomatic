import { type UIRepairFailureClassification, type UIRepairFailureInput, type UIRepairFailureKind } from "./uiReliabilityRepairModel";

const RULES: Array<{ kind: UIRepairFailureKind; confidence: "high"|"medium"; tests: RegExp[] }> = [
  { kind: "unsafe-operation", confidence: "high", tests: [/protected path/i,/unsafe operation/i,/blocked operation/i] },
  { kind: "missing-file", confidence: "high", tests: [/enoent/i,/no such file/i,/missing path/i] },
  { kind: "patch-conflict", confidence: "high", tests: [/beforeSnippet mismatch/i,/patch conflict/i,/failed to apply patch/i] },
  { kind: "source-identity-stale", confidence: "high", tests: [/stale identity/i,/identity mismatch/i] },
  { kind: "parse-error", confidence: "high", tests: [/syntaxerror/i,/parse error/i,/unexpected token/i] },
  { kind: "type-error", confidence: "high", tests: [/\bTS\d+\b/,/type .* is not assignable/i,/typescript error/i] },
  { kind: "build-error", confidence: "medium", tests: [/build failed/i,/vite build/i,/next\.js build/i] },
  { kind: "test-error", confidence: "medium", tests: [/assertionerror/i,/\btest failed\b/i,/expected .* to/i] },
  { kind: "lint-error", confidence: "medium", tests: [/eslint/i,/prettier/i,/lint error/i] }
];

export function classifyUIRepairFailures(inputs: UIRepairFailureInput[]): UIRepairFailureClassification[] {
  return (Array.isArray(inputs) ? inputs : []).map((input, idx) => {
    const stderr = typeof input?.stderr === "string" ? input.stderr : "";
    const stdout = typeof input?.stdout === "string" ? input.stdout : "";
    const msg = `${input?.command ?? ""}\n${stderr}\n${stdout}\n${JSON.stringify(input?.roundTripValidationResult ?? {})}`.trim();
    const normalizedMessage = msg.replace(/\s+/g, " ").slice(0, 400) || "unknown failure";
    const rule = RULES.find((r) => r.tests.some((t) => t.test(msg)));
    const kind: UIRepairFailureKind = rule?.kind ?? "unknown";
    const confidence: "high"|"medium"|"low" = rule?.confidence ?? "low";
    const evidenceSnippets = (msg.match(/[^\n]{1,180}/g) ?? []).slice(0, 3);
    return { kind, confidence, normalizedMessage, evidenceSnippets, affectedFilePath: input?.filePath, affectedNodeId: input?.nodeId, operationId: input?.operationId ?? `op-${idx}` };
  }).sort((a,b)=>`${a.kind}:${a.operationId ?? ""}`.localeCompare(`${b.kind}:${b.operationId ?? ""}`));
}
