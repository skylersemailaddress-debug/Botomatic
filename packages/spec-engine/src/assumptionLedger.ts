import { SpecAssumption } from "./specModel";

export function makeAssumption(input: {
  field: string;
  decision: string;
  reason: string;
  importance: number;
  risk: "low" | "medium" | "high";
  madeBy: string;
  canChangeLater?: boolean;
}): SpecAssumption {
  return {
    id: `assumption_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
    field: input.field,
    decision: input.decision,
    reason: input.reason,
    importance: input.importance,
    risk: input.risk,
    madeBy: input.madeBy,
    requiresApproval: input.risk === "high",
    approved: input.risk !== "high",
    canChangeLater: input.canChangeLater ?? true,
    createdAt: new Date().toISOString(),
  };
}

export function approveAssumptions(assumptions: SpecAssumption[], ids: string[]): SpecAssumption[] {
  const idSet = new Set(ids);
  return assumptions.map((a) => (idSet.has(a.id) ? { ...a, approved: true } : a));
}

export function unresolvedAssumptions(assumptions: SpecAssumption[]): SpecAssumption[] {
  return assumptions.filter((a) => a.requiresApproval && !a.approved);
}
