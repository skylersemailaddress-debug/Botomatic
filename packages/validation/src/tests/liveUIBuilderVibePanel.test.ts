import assert from "node:assert";
import { readFileSync } from "node:fs";

const vibeDashboard = readFileSync("apps/control-plane/src/components/vibe/VibeDashboard.tsx", "utf8");
const commercialVibe = readFileSync("apps/control-plane/src/components/commercial/CommercialVibeCockpit.tsx", "utf8");

const hasLegacySafeVibePanel =
  vibeDashboard.includes("runEditCommand") &&
  vibeDashboard.includes("Apply Change") &&
  !vibeDashboard.includes("Apply destructive sample");

const hasCommercialSafeVibePanel =
  commercialVibe.includes("commercial-vibe-command-dock") &&
  commercialVibe.includes("Improve Design") &&
  commercialVibe.includes("Run Tests") &&
  commercialVibe.includes("Launch App") &&
  commercialVibe.includes("No generated preview yet") &&
  !commercialVibe.includes("Apply destructive sample") &&
  !commercialVibe.includes("runDestructiveEdit");

assert(
  hasLegacySafeVibePanel || hasCommercialSafeVibePanel,
  "Vibe panel must expose safe edit controls and must not expose destructive sample controls",
);

console.log("liveUIBuilderVibePanel.test.ts passed");
