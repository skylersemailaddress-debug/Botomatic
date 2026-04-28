import { SelfUpgradeSpec } from "./selfUpgradeSpec";

export type DriftDetectionResult = {
  driftDetected: boolean;
  reasons: string[];
};

const DRIFT_PATTERNS: Array<{ pattern: RegExp; reason: string }> = [
  { pattern: /mode button|guided mode|autopilot mode/i, reason: "Request conflicts with no-mode-button constitution." },
  { pattern: /lower\s+validator\s+threshold|weaken\s+validator|disable\s+validator/i, reason: "Validator threshold weakening language detected." },
  { pattern: /remove\s+(required\s+)?validator|skip\s+validate:all/i, reason: "Removing required validators is prohibited." },
  { pattern: /launch\s+live\s+without\s+review|bypass\s+governance\s+for\s+deployment/i, reason: "Launch/deployment claim broadening detected." },
  { pattern: /direct\s+to\s+main|commit\s+to\s+main|bypass\s+pr/i, reason: "Bypassing PR-only policy is prohibited." },
];

export function detectArchitectureDrift(spec: SelfUpgradeSpec): DriftDetectionResult {
  const reasons: string[] = [];
  const text = `${spec.request}\n${spec.objective}`;
  if (spec.affectedModules.includes("apps/control-plane") && /mode button|guided mode|autopilot mode/i.test(spec.request)) {
    reasons.push("Request conflicts with no-mode-button constitution.");
  }
  for (const { pattern, reason } of DRIFT_PATTERNS) {
    if (pattern.test(text) && !reasons.includes(reason)) reasons.push(reason);
  }
  return { driftDetected: reasons.length > 0, reasons };
}
