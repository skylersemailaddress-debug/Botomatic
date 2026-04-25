export type PlannedPatch = {
  id: string;
  description: string;
};

export function applyPlannedPatches(patches: PlannedPatch[]): { applied: number; skipped: number } {
  return { applied: patches.length, skipped: 0 };
}
