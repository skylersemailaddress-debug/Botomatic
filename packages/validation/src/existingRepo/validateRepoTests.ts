type RuleResult = { ok: boolean; issues: string[] };

export function validateRepoTests(input: { testsPass: boolean; testsWereAddedIfMissing: boolean }): RuleResult {
  const issues: string[] = [];
  if (!input.testsPass && !input.testsWereAddedIfMissing) {
    issues.push("Tests do not pass and missing tests were not added.");
  }
  return { ok: issues.length === 0, issues };
}
