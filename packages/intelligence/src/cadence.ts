export type RambleCadence = "disabled" | "after_compile" | "after_execution" | "always";

export function shouldRunRamble(cadence: RambleCadence, stage: "compile" | "execution"): boolean {
  if (cadence === "disabled") return false;
  if (cadence === "always") return true;
  if (cadence === "after_compile" && stage === "compile") return true;
  if (cadence === "after_execution" && stage === "execution") return true;
  return false;
}
