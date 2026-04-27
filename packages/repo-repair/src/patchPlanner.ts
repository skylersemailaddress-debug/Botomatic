export function planPatches(blockers: string[]): string[] {
  return blockers.map((blocker, index) => `patch_${index + 1}: ${blocker}`);
}
