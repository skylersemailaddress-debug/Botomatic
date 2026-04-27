import { planSelfUpgrade } from "../planner";
import { detectArchitectureDrift } from "../architectureDriftDetector";

const spec = planSelfUpgrade("Improve validator quality and add a Botomatic feature safely");
if (!spec.affectedModules.length) {
  throw new Error("Self-upgrade planner did not map affected modules");
}

const drift = detectArchitectureDrift(spec);
if (drift.driftDetected) {
  throw new Error(`Unexpected drift for safe request: ${drift.reasons.join("; ")}`);
}

const driftSpec = planSelfUpgrade("Add guided mode button to Botomatic UI");
const driftDetected = detectArchitectureDrift(driftSpec);
if (!driftDetected.driftDetected) {
  throw new Error("Expected drift detection for mode-button violating request");
}

console.log("selfUpgrade.test.ts passed");
