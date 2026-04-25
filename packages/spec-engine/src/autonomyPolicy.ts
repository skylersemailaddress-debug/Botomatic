import { RiskLevel } from "./specModel";

const NEVER_AUTO_DECIDE = [
  "payments",
  "legal",
  "compliance",
  "auth",
  "security",
  "permissions",
  "data deletion",
  "data retention",
  "regulated",
  "external api costs",
  "public/private visibility",
  "irreversible",
];

export function isHighRiskField(field: string): boolean {
  const lower = field.toLowerCase();
  return NEVER_AUTO_DECIDE.some((term) => lower.includes(term));
}

export function shouldAutoDecide(input: {
  field: string;
  importance: number;
  risk: RiskLevel;
  userDelegated: boolean;
}): boolean {
  if (isHighRiskField(input.field)) return false;
  if (input.importance >= 9) return false;
  if (input.importance >= 7) return input.userDelegated && input.risk === "low";
  if (input.importance >= 4) return input.userDelegated && input.risk !== "high";
  return input.risk === "low" || input.userDelegated;
}
