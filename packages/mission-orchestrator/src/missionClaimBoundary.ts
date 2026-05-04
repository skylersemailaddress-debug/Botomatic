import { Mission, MissionClaimLevel, MissionWave } from "./missionModel.js";

const CLAIM_RANK: Record<MissionClaimLevel, number> = {
  MISSION_COMPILED: 0,
  WAVE_READY: 1,
  WAVE_PROVEN: 2,
  SYSTEM_PARTIAL: 3,
  SYSTEM_BUILDABLE: 4,
  SYSTEM_RUNTIME_PROVEN: 5,
  SYSTEM_LAUNCH_READY: 6,
};

// Core infrastructure wave IDs that anchor the claim ladder.
// These are checked if present in the mission; if absent, fall back to positional logic.
const CORE_INFRA_WAVES = ["repo_layout", "api_schema", "builder_factory"] as const;
const VALIDATION_WAVES = ["validation_proof"] as const;
const TERMINAL_WAVES = new Set(["fresh_clone_proof"]);

// For a given mission, compute which wave IDs are required to claim each level.
// This is DYNAMIC — it uses only waves that exist in the mission, never hardcoded Nexus IDs.
function requiredWavesForLevel(mission: Mission, level: MissionClaimLevel): string[] {
  const waves = mission.waves;
  if (waves.length === 0) return [];

  const waveIds = waves.map((w) => w.waveId);
  const waveSet = new Set(waveIds);

  const corePresent = (CORE_INFRA_WAVES as readonly string[]).filter((id) => waveSet.has(id));
  const validationPresent = (VALIDATION_WAVES as readonly string[]).filter((id) => waveSet.has(id));

  // Non-terminal waves (all waves except known terminal ones)
  const nonTerminal = waveIds.filter((id) => !TERMINAL_WAVES.has(id));

  switch (level) {
    case "MISSION_COMPILED":
      return [];
    case "WAVE_READY":
      return [];
    case "WAVE_PROVEN":
      return [];
    case "SYSTEM_PARTIAL":
      // First wave proven OR repo_layout if present
      return waveSet.has("repo_layout") ? ["repo_layout"] : [waveIds[0]];
    case "SYSTEM_BUILDABLE":
      // Core infra waves, falling back to first 40% of waves
      return corePresent.length > 0
        ? corePresent
        : waveIds.slice(0, Math.max(1, Math.ceil(waveIds.length * 0.4)));
    case "SYSTEM_RUNTIME_PROVEN":
      // All non-terminal waves + validation, or 80% of all waves
      if (validationPresent.length > 0 && corePresent.length > 0) {
        return [...new Set([...nonTerminal])];
      }
      return waveIds.slice(0, Math.max(1, Math.ceil(waveIds.length * 0.8)));
    case "SYSTEM_LAUNCH_READY":
      // All waves — complete mission
      return waveIds;
  }
}

export function evaluateMissionClaim(mission: Mission): MissionClaimLevel {
  const waves = mission.waves;
  const provenIds = new Set(waves.filter((w) => w.status === "proven").map((w) => w.waveId));
  const provenCount = provenIds.size;
  const totalCount = waves.length;

  const hasAnyProven = provenCount > 0;
  const hasAnyReady = waves.some((w) => w.status === "ready");

  const allProven = (ids: string[]) => ids.length > 0 && ids.every((id) => provenIds.has(id));

  // Walk from highest to lowest, return first supported level
  const levels: MissionClaimLevel[] = [
    "SYSTEM_LAUNCH_READY",
    "SYSTEM_RUNTIME_PROVEN",
    "SYSTEM_BUILDABLE",
    "SYSTEM_PARTIAL",
    "WAVE_PROVEN",
    "WAVE_READY",
    "MISSION_COMPILED",
  ];

  for (const level of levels) {
    const required = requiredWavesForLevel(mission, level);

    if (required.length === 0) {
      if (level === "WAVE_PROVEN" && !hasAnyProven) continue;
      if (level === "WAVE_READY" && !hasAnyReady && !hasAnyProven) continue;
      return level;
    }

    if (allProven(required)) return level;
  }

  return "MISSION_COMPILED";
}

export interface ClaimBoundaryResult {
  requested: MissionClaimLevel;
  supported: MissionClaimLevel;
  allowed: boolean;
  reason: string;
  missingWaves: string[];
  provenWaves: string[];
}

export function checkClaimBoundary(
  mission: Mission,
  requestedLevel: MissionClaimLevel
): ClaimBoundaryResult {
  const supported = evaluateMissionClaim(mission);
  const allowed = CLAIM_RANK[supported] >= CLAIM_RANK[requestedLevel];

  const provenIds = new Set(mission.waves.filter((w) => w.status === "proven").map((w) => w.waveId));
  const required = requiredWavesForLevel(mission, requestedLevel);
  const missingWaves = required.filter((id) => !provenIds.has(id));
  const provenWaves = required.filter((id) => provenIds.has(id));

  const reason = allowed
    ? `Claim "${requestedLevel}" supported — all required waves proven.`
    : `Claim "${requestedLevel}" blocked — missing proven waves: ${missingWaves.join(", ")}. Supported level: "${supported}".`;

  return { requested: requestedLevel, supported, allowed, reason, missingWaves, provenWaves };
}

export function getUnprovenRequiredWaves(
  mission: Mission,
  targetLevel: MissionClaimLevel
): string[] {
  const provenIds = new Set(mission.waves.filter((w) => w.status === "proven").map((w) => w.waveId));
  return requiredWavesForLevel(mission, targetLevel).filter((id) => !provenIds.has(id));
}

export function formatClaimBoundaryReport(mission: Mission): string {
  const lines: string[] = [
    `Mission: ${mission.missionId}`,
    `Status: ${mission.status}`,
    `Proven waves: ${mission.provenWaves}/${mission.totalWaves}`,
    `Current claim level: ${mission.claimLevel}`,
    "",
    "Claim Boundary Table:",
  ];

  const levels: MissionClaimLevel[] = [
    "MISSION_COMPILED", "WAVE_READY", "WAVE_PROVEN",
    "SYSTEM_PARTIAL", "SYSTEM_BUILDABLE", "SYSTEM_RUNTIME_PROVEN", "SYSTEM_LAUNCH_READY",
  ];

  for (const level of levels) {
    const result = checkClaimBoundary(mission, level);
    const icon = result.allowed ? "✅" : "🔒";
    const missing = result.missingWaves.length > 0 ? ` (missing: ${result.missingWaves.join(", ")})` : "";
    lines.push(`  ${icon} ${level}${missing}`);
  }

  return lines.join("\n");
}
