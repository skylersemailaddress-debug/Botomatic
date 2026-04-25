type RuleResult = { ok: boolean; issues: string[] };

const FORBIDDEN = [
  "TODO",
  "FIXME",
  "placeholder",
  "mock",
  "stub",
  "sample",
  "coming soon",
  "lorem ipsum",
  "fake",
  "dummy",
  "not implemented",
  "throw new Error(\"not implemented\")",
  "console.log(\"not implemented\")",
  "console-only implementation",
  "fake auth",
  "fake payment",
  "fake integration",
];

export function validateNoPlaceholders(content: string): RuleResult {
  const lower = content.toLowerCase();
  const issues = FORBIDDEN
    .filter((t) => lower.includes(t.toLowerCase()))
    .map((t) => `Forbidden placeholder token detected: ${t}`);

  return { ok: issues.length === 0, issues };
}
