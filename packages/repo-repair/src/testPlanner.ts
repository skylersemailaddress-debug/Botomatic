export function planTests(input: { missingCoverageAreas: string[] }): string[] {
  return input.missingCoverageAreas.map((area) => `Add tests for ${area}`);
}
