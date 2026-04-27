type RuleResult = { ok: boolean; issues: string[] };

const TOKENS = [
  "todo",
  "fixme",
  "placeholder",
  "mock",
  "stub",
  "coming soon",
  "lorem ipsum",
  "fake",
  "dummy",
  "not implemented",
  "throw new error(\"not implemented\")",
];

export function validateRepoNoPlaceholders(source: string): RuleResult {
  const lower = source.toLowerCase();
  const issues = TOKENS.filter((t) => lower.includes(t)).map((t) => `Placeholder token detected: ${t}`);
  return { ok: issues.length === 0, issues };
}
