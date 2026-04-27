import { SelfUpgradeSpec } from "./selfUpgradeSpec";

export type DriftDetectionResult = {
  driftDetected: boolean;
  reasons: string[];
};

export function detectArchitectureDrift(spec: SelfUpgradeSpec): DriftDetectionResult {
  const reasons: string[] = [];
  if (spec.affectedModules.includes("apps/control-plane") && /mode button|guided mode|autopilot mode/i.test(spec.request)) {
    reasons.push("Request conflicts with no-mode-button constitution.");
  }
  return { driftDetected: reasons.length > 0, reasons };
}
