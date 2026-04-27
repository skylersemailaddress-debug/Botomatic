export function incrementalValidate(targetedValidatorResults: Array<{ name: string; passed: boolean }>): {
  passed: boolean;
  failing: string[];
} {
  const failing = targetedValidatorResults.filter((r) => !r.passed).map((r) => r.name);
  return { passed: failing.length === 0, failing };
}
