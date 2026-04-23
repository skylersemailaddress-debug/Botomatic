export function enrichMasterTruth(truth: any, suggestions: string[]) {
  const enriched = { ...truth };

  if (!enriched.assumptions) enriched.assumptions = [];

  for (const s of suggestions) {
    if (!enriched.assumptions.includes(s)) {
      enriched.assumptions.push(s);
    }
  }

  return enriched;
}
