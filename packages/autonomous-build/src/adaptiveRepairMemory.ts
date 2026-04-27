import fs from "fs";
import path from "path";
import type { FailureCategory } from "./failurePolicy";
import type { StrategyRiskLevel } from "./repairStrategyRegistry";

export type AdaptiveRepairOutcome = {
  failureSignature: string;
  failureCategory: FailureCategory;
  affectedSubsystem: string;
  selectedStrategyId: string;
  strategyRisk: StrategyRiskLevel;
  repairActionSummary: string;
  validationCommand: string;
  validationResult: "passed" | "failed" | "not_run";
  outcome: "success" | "failed" | "skipped" | "escalated";
  timestamp: string;
  artifactPaths: string[];
  filesChanged: string[];
  proofArtifactPath?: string;
  rollbackInfo: string;
  notes: string;
  reverted: boolean;
};

export type AdaptiveRepairMemoryFile = {
  version: 1;
  updatedAt: string;
  records: AdaptiveRepairOutcome[];
};

const MEMORY_PATH = path.join(process.cwd(), "release-evidence", "runtime", "repair_strategy_memory.json");

function ensureDir(targetPath: string) {
  fs.mkdirSync(path.dirname(targetPath), { recursive: true });
}

function defaultMemory(): AdaptiveRepairMemoryFile {
  return {
    version: 1,
    updatedAt: new Date(0).toISOString(),
    records: [],
  };
}

export function readAdaptiveRepairMemory(): AdaptiveRepairMemoryFile {
  if (!fs.existsSync(MEMORY_PATH)) {
    return defaultMemory();
  }

  try {
    const parsed = JSON.parse(fs.readFileSync(MEMORY_PATH, "utf8"));
    if (!parsed || !Array.isArray(parsed.records)) {
      return defaultMemory();
    }
    return {
      version: 1,
      updatedAt: String(parsed.updatedAt || new Date().toISOString()),
      records: parsed.records,
    };
  } catch {
    return defaultMemory();
  }
}

export function writeAdaptiveRepairMemory(memory: AdaptiveRepairMemoryFile): void {
  ensureDir(MEMORY_PATH);
  const payload: AdaptiveRepairMemoryFile = {
    version: 1,
    updatedAt: new Date().toISOString(),
    records: memory.records.slice(-500),
  };
  fs.writeFileSync(MEMORY_PATH, JSON.stringify(payload, null, 2), "utf8");
}

export function recordAdaptiveRepairOutcome(outcome: AdaptiveRepairOutcome): AdaptiveRepairMemoryFile {
  const current = readAdaptiveRepairMemory();
  const updated: AdaptiveRepairMemoryFile = {
    version: 1,
    updatedAt: new Date().toISOString(),
    records: [...current.records, outcome].slice(-500),
  };
  writeAdaptiveRepairMemory(updated);
  return updated;
}

export function findSimilarAdaptiveOutcomes(input: {
  failureCategory: FailureCategory;
  affectedSubsystem: string;
  failureSignature?: string;
}): AdaptiveRepairOutcome[] {
  const memory = readAdaptiveRepairMemory();
  const subsystem = input.affectedSubsystem.toLowerCase();
  return memory.records
    .filter((record) => {
      if (record.failureCategory !== input.failureCategory) return false;
      const sameSubsystem = record.affectedSubsystem.toLowerCase() === subsystem;
      const sameSignature = input.failureSignature ? record.failureSignature === input.failureSignature : false;
      return sameSubsystem || sameSignature;
    })
    .slice(-30)
    .reverse();
}

export function summarizeStrategyOutcomesForSignature(failureSignature: string): Record<string, { success: number; failed: number }> {
  const memory = readAdaptiveRepairMemory();
  const summary: Record<string, { success: number; failed: number }> = {};

  for (const record of memory.records) {
    if (record.failureSignature !== failureSignature) continue;
    if (!summary[record.selectedStrategyId]) {
      summary[record.selectedStrategyId] = { success: 0, failed: 0 };
    }
    if (record.outcome === "success") summary[record.selectedStrategyId].success += 1;
    if (record.outcome === "failed") summary[record.selectedStrategyId].failed += 1;
  }

  return summary;
}
